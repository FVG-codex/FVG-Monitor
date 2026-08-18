// Job di ingestione "leggera" (Fase 1): fonti API/RSS dirette, nessun
// browser headless necessario. Gira su GitHub Actions ogni 15 minuti
// (vedi .github/workflows/ingest-light.yml).
//
// Richiede due variabili d'ambiente (impostate come GitHub Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   ← NON la chiave anon: questa bypassa RLS
//                                  ed è l'unica autorizzata a scrivere.

import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nell'ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Il testo del bollettino contiene entità HTML (es. "igrave;" per "ì")
// che fast-xml-parser non decodifica automaticamente, non essendo
// entità XML standard — solo &amp; &lt; &gt; &quot; &apos; lo sono.
const ENTITA_HTML = {
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  Agrave: "À", Egrave: "È", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  ecirc: "ê", ocirc: "ô", nbsp: " ", ndash: "–", mdash: "—",
  laquo: "«", raquo: "»", deg: "°", agrave1: "à",
};

function decodeEntitaHtml(str) {
  return str.replace(/&([a-zA-Z]+);/g, (match, nome) => ENTITA_HTML[nome] ?? match);
}

// Quando un tag XML ha sia un attributo che del testo (es.
// <TMIN um="°C">21</TMIN>), fast-xml-parser restituisce un oggetto
// { "@_um": "°C", "#text": "21" } invece di una stringa semplice.
// Questo helper normalizza entrambi i casi, per evitare di scrivere
// oggetti dove il frontend si aspetta testo (causa un crash React),
// e decodifica le entità HTML residue.
function testo(v) {
  if (v === null || v === undefined) return null;
  const s = typeof v === "object" ? (v["#text"] !== undefined ? String(v["#text"]) : null) : String(v);
  return s === null ? null : decodeEntitaHtml(s);
}

async function upsertSnapshot(id, module, zone, data) {
  const { error } = await supabase
    .from("snapshots")
    .upsert({ id, module, zone, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Upsert fallito per ${id}: ${error.message}`);

  // storico: una riga in più ad ogni esecuzione, utile in fasi successive
  const { error: histError } = await supabase
    .from("history")
    .insert({ module, zone, data });
  if (histError) console.warn(`Storico non salvato per ${module}: ${histError.message}`);
}

// ---------------------------------------------------------------------
// METEO — bollettino previsioni OSMER ARPA FVG
// Fonte pubblica per sviluppatori (dev.meteo.fvg.it), non soggetta al
// vincolo delle 24h che riguarda invece i dati REAL-TIME delle stazioni.
// Le uniche osservazioni di stazione che ingeriamo qui sono quelle del
// giorno precedente (già oltre le 24h), etichettate esplicitamente
// "ieri" nel frontend — MAI la temperatura "adesso".
// ---------------------------------------------------------------------

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function ingestMeteo() {
  const now = new Date();
  const oggi = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}`;
  const ieriDate = new Date(now);
  ieriDate.setUTCDate(ieriDate.getUTCDate() - 1);
  const dataIeriStr = `${ieriDate.getUTCFullYear()}${pad2(ieriDate.getUTCMonth() + 1)}${pad2(ieriDate.getUTCDate())}`;

  // Il bollettino di oggi viene pubblicato di solito verso mezzogiorno
  // UTC — nelle ore prima non esiste ancora (404). In quel caso usiamo
  // quello di ieri, così il dato viene comunque rielaborato con il
  // codice più recente invece di lasciare ferma una riga vecchia su
  // Supabase fino alla pubblicazione.
  let res = await fetch(`https://dev.meteo.fvg.it/xml/previsioni/PW${oggi}.xml`);
  if (!res.ok) {
    console.warn(`Bollettino di oggi (${oggi}) non disponibile, provo con quello di ieri (${dataIeriStr})`);
    res = await fetch(`https://dev.meteo.fvg.it/xml/previsioni/PW${dataIeriStr}.xml`);
  }
  if (!res.ok) {
    console.warn(`Nessun bollettino disponibile (né oggi né ieri, HTTP ${res.status})`);
    return;
  }

  const parsed = xml.parse(await res.text());
  const root = parsed.data;
  const previsioni = root.previsioni;
  const scadenzeRaw = Array.isArray(previsioni.scadenze.scadenza)
    ? previsioni.scadenze.scadenza
    : [previsioni.scadenze.scadenza];

  // Mappa zone qualitative (cielo/pioggia/temporale) per provincia,
  // più le fasce F3 (Bassa Pianura → entroterra) e F4 (Costa → Trieste)
  // per le temperature min/max: il bollettino OSMER non dà una
  // temperatura puntuale per città, solo un intervallo per fascia
  // altimetrica — è un'approssimazione dichiarata, non un dato esatto.
  const ZONA_PER_CITTA = { trieste: "A9", udine: "A6", gorizia: "A7", pordenone: "A5" };
  const FASCIA_TEMP_PER_CITTA = { trieste: "F4", udine: "F3", gorizia: "F3", pordenone: "F3" };

  const scadenze = scadenzeRaw.map((s) => {
    const zoneList = Array.isArray(s.zone.zona) ? s.zone.zona : [s.zone.zona];
    const zoneByNome = Object.fromEntries(zoneList.map((z) => [z["@_nome"], z]));

    const perCitta = {};
    for (const [citta, codiceZona] of Object.entries(ZONA_PER_CITTA)) {
      const z = zoneByNome[codiceZona];
      const fascia = zoneByNome[FASCIA_TEMP_PER_CITTA[citta]];
      perCitta[citta] = {
        cielo: testo(z?.CIELO_DESCRIZIONE),
        pioggia: testo(z?.PIOGGIA_DESCRIZIONE),
        temporale: testo(z?.TEMPORALE_DESCRIZIONE),
        tmin: testo(fascia?.TMIN),
        tmax: testo(fascia?.TMAX),
      };
    }

    return {
      giorno: testo(s["@_giorno"]), // "DOMANI" | "DOPODOMANI"
      data_validita: testo(s["@_data_validita"]),
      regione_testo: testo(zoneByNome.REGIONE?.TESTO),
      per_citta: perCitta,
    };
  });

  // Osservazioni del giorno precedente (già >24h, pubblicabili)
  const osservazioniData = testo(root.osservazioni?.["@_data"]);
  const stazioniRaw = root.osservazioni?.stazioni?.stazione;
  const stazioniList = stazioniRaw ? (Array.isArray(stazioniRaw) ? stazioniRaw : [stazioniRaw]) : [];
  const ieri = Object.fromEntries(
    stazioniList
      .filter((s) => s["@_nome"])
      .map((s) => {
        const tmin = testo(s.TMIN);
        const tmax = testo(s.TMAX);
        return [
          testo(s["@_nome"]),
          { tmin: tmin === "n.d." ? null : tmin, tmax: tmax === "n.d." ? null : tmax },
        ];
      })
  );

  const payload = {
    bollettino_emesso: testo(previsioni.emissione),
    situazione_generale: testo(previsioni.SITUAZIONEGENERALE_TESTO),
    tendenza: testo(previsioni.TENDENZA_TESTO),
    scadenze,
    osservazioni_data: osservazioniData,
    ieri,
  };

  await upsertSnapshot("meteo:previsioni", "meteo", null, payload);
  console.log("Meteo aggiornato:", testo(previsioni.emissione));
}

// ---------------------------------------------------------------------
// NOTIZIE — RSS ANSA Friuli Venezia Giulia
//
// NOTA: il feed ANSA riporta la dicitura "FOR PERSONAL USE ONLY".
// Per restare su un uso ragionevole e rispettoso della fonte,
// pubblichiamo SOLO titolo + link + data (mai il testo dell'articolo),
// con link diretto all'originale — lo stesso schema di un aggregatore
// RSS standard. Vale comunque la pena rivalutare questo punto,
// eventualmente contattando ANSA per un utilizzo esplicitamente
// autorizzato, se il progetto dovesse crescere.
// ---------------------------------------------------------------------

async function ingestNotizie() {
  const url = "https://www.ansa.it/friuliveneziagiulia/notizie/friuliveneziagiulia_rss.xml";
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`RSS ANSA non disponibile (HTTP ${res.status})`);
    return;
  }

  const parsed = xml.parse(await res.text());
  const itemsRaw = parsed.rss?.channel?.item || [];
  const items = (Array.isArray(itemsRaw) ? itemsRaw : [itemsRaw]).slice(0, 10).map((item) => ({
    titolo: testo(item.title),
    link: testo(item.link),
    data: testo(item.pubDate),
  }));

  await upsertSnapshot("notizie:ansa-fvg", "notizie", null, {
    fonte: "ANSA Friuli Venezia Giulia",
    fonte_url: "https://www.ansa.it/friuliveneziagiulia/",
    items,
  });
  console.log(`Notizie aggiornate: ${items.length} titoli`);
}

// ---------------------------------------------------------------------
// VENTO / BORA — API Monitoraggio Protezione Civile FVG
// Fonte: monitor.protezionecivile.fvg.it/api, licenza CC BY 4.0.
//
// Una stazione candidata per ciascuna provincia (scelte tra quelle con
// nome "meteo"/"S+M", più probabile abbiano un sensore vento — non
// verificato singolarmente come per Trieste). Per questo i sensori
// vengono risolti DINAMICAMENTE via /sensors invece di assumere ID
// fissi: se una stazione non ha il sensore vento, la ingestione per
// quella provincia viene saltata con un avviso, senza rompersi.
// ---------------------------------------------------------------------

const PC_API_BASE = "https://monitor.protezionecivile.fvg.it/api";

const STAZIONE_VENTO_PER_PROVINCIA = {
  trieste: 212, // "Trieste" — verificata
  udine: 558, // "Udine S+M" — verificata
  gorizia: 65, // "Gorizia aeroporto" — verificata
  pordenone: 131, // "Pordenone meteo" — verificata (567 "Pordenone S+M" ha il sensore ma nessuna misura recente)
};

const CODICI_SENSORE_VENTO = {
  direzione: "Dv",
  velocita: "Vv",
  raffica: "VvMax",
  direzioneRaffica: "DvMax",
};

async function sensoriStazione(stationId) {
  const res = await fetch(`${PC_API_BASE}/stations/${stationId}/sensors`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.sensors ?? [];
}

async function ultimaMisura(stationId, sensorId) {
  const res = await fetch(`${PC_API_BASE}/stations/${stationId}/sensors/${sensorId}/measures/latest`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.measures?.[0] ?? null;
}

// m/s → km/h, unità più familiare per il pubblico italiano
const msToKmh = (v) => (v == null ? null : Math.round(v * 3.6 * 10) / 10);

async function ingestVentoProvincia(provincia, stationId, nomeStazione, zona) {
  const sensori = await sensoriStazione(stationId);
  const trovaId = (codice) => sensori.find((s) => s.code === codice)?.id ?? null;

  const idVelocita = trovaId(CODICI_SENSORE_VENTO.velocita);
  if (!idVelocita) {
    console.warn(`Stazione "${nomeStazione}" (${provincia}) non ha un sensore vento — salto`);
    return;
  }

  const [direzione, velocita, raffica, direzioneRaffica] = await Promise.all([
    ultimaMisura(stationId, trovaId(CODICI_SENSORE_VENTO.direzione)),
    ultimaMisura(stationId, idVelocita),
    ultimaMisura(stationId, trovaId(CODICI_SENSORE_VENTO.raffica)),
    ultimaMisura(stationId, trovaId(CODICI_SENSORE_VENTO.direzioneRaffica)),
  ]);

  if (!velocita) {
    console.warn(`Nessuna misura vento disponibile per "${nomeStazione}" (${provincia})`);
    return;
  }

  const payload = {
    stazione: nomeStazione,
    aggiornato_al: velocita.dt,
    velocita_kmh: msToKmh(velocita.value),
    raffica_kmh: msToKmh(raffica?.value),
    direzione_gradi: direzione?.value ?? null,
    direzione_raffica_gradi: direzioneRaffica?.value ?? null,
  };

  await upsertSnapshot(`vento:${provincia}`, "vento", zona, payload);
  console.log(`Vento aggiornato (${provincia}):`, payload.velocita_kmh, "km/h");
}

async function ingestVento() {
  const ZONA_PER_PROVINCIA = { trieste: "C", udine: "B", gorizia: "C", pordenone: "A" };
  const nomiStazioni = { trieste: "Trieste", udine: "Udine S+M", gorizia: "Gorizia aeroporto", pordenone: "Pordenone meteo" };

  await Promise.all(
    Object.entries(STAZIONE_VENTO_PER_PROVINCIA).map(([provincia, stationId]) =>
      ingestVentoProvincia(provincia, stationId, nomiStazioni[provincia], ZONA_PER_PROVINCIA[provincia])
    )
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// VIABILITÀ — feed WFS pubblico di InfoViaggiando (Autostrade Alto
// Adriatico / rete BS-PD). Nessuna documentazione ufficiale trovata
// per questo endpoint (è quello usato internamente dalla loro mappa,
// non un'API dichiaratamente pubblica) — dato che i dati risultanti
// sono comunque informazioni di viabilità già mostrate pubblicamente
// sul loro sito, lo trattiamo con la stessa cautela riservata al feed
// ANSA: solo dati essenziali, nessuna rielaborazione oltre il
// filtraggio geografico, da rivalutare se il progetto cresce.
//
// Il feed copre una rete molto più ampia del FVG (fino a Brescia/
// Padova) — filtriamo per autostrade rilevanti E per area geografica.
// ---------------------------------------------------------------------

const AUTOSTRADE_FVG = new Set(["A4", "A23", "A28", "A34"]);
const BBOX_FVG = { latMin: 45.5, latMax: 46.7, lonMin: 12.3, lonMax: 13.9 };

function dentroFVG(lat, lon) {
  if (lat == null || lon == null) return false;
  return lat >= BBOX_FVG.latMin && lat <= BBOX_FVG.latMax && lon >= BBOX_FVG.lonMin && lon <= BBOX_FVG.lonMax;
}

async function ingestViabilita() {
  const url =
    "https://infoviaggiando.it/WFS/?service=WFS&request=GetFeature&version=1.1.0" +
    "&typename=PortaleWeb:EVENTI_LINEARI&outputFormat=application/json&CQL_FILTER=VIS_WEB=%27S%27";

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Feed viabilità non disponibile (HTTP ${res.status})`);
    return;
  }

  const json = await res.json();
  const eventi = (json.features || [])
    .map((f) => f.properties)
    .filter(
      (p) =>
        AUTOSTRADE_FVG.has(p.AUTOSTRADA) &&
        (dentroFVG(p.LAT_INIZIO, p.LON_INIZIO) || dentroFVG(p.LAT_FINE, p.LON_FINE))
    )
    .map((p) => ({
      autostrada: p.AUTOSTRADA,
      carreggiata: p.CARREGGIATA,
      testo: p.TESTO_IT,
      inizio: p.DATA_INIZIO,
      fine: p.DATA_FINE,
      fonte: p.FONTE,
    }));

  await upsertSnapshot("viabilita:autostrade", "viabilita", null, {
    eventi,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Viabilità aggiornata: ${eventi.length} eventi in FVG`);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// EVENTI — scraping HTML della pagina eventi di turismofvg.it
// (portale ufficiale PromoTurismoFVG). La pagina è renderizzata
// server-side (verificato: un semplice fetch restituisce già tutti gli
// eventi, senza bisogno di eseguire JavaScript), quindi niente browser
// headless necessario. Struttura HTML verificata manualmente via
// devtools — se il sito cambia layout, questo parser andrà aggiornato.
//
// Estraiamo solo i campi presenti in modo coerente in entrambe le
// varianti di card osservate (big/small): titolo, data, luogo, link —
// non l'ora o la categoria, che variano tra le due varianti.
// ---------------------------------------------------------------------

async function ingestEventi() {
  const res = await fetch("https://www.turismofvg.it/eventi", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`Pagina eventi non disponibile (HTTP ${res.status})`);
    return;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const eventi = [];
  $("a.c-eventsResults__item").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href) return;
    const link = href.startsWith("http") ? href : `https://www.turismofvg.it${href}`;

    const giorno = $el.find(".info_date strong").first().text().trim();
    const mese = $el.find(".info_date p").first().text().trim();
    const luogo = $el.find(".col2").first().text().trim();
    const dataTesto = $el.find(".item_title p strong").first().text().trim();
    const titolo = $el.find(".item_title h1 strong, .item_title h2 strong").first().text().trim();

    if (titolo) {
      eventi.push({ titolo, luogo, giorno, mese, data_testo: dataTesto, link });
    }
  });

  if (eventi.length === 0) {
    console.warn("Nessun evento estratto — la struttura HTML della pagina potrebbe essere cambiata");
    return;
  }

  await upsertSnapshot("eventi:turismofvg", "eventi", null, {
    eventi: eventi.slice(0, 20),
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Eventi aggiornati: ${eventi.length} trovati`);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// QUALITÀ ARIA — dataset PM10 su dati.friuliveneziagiulia.it (Socrata)
// Fonte: ARPA FVG, dataset "Aria - Particelle Sospese PM10" (id
// qp5k-6pvm). Dato giornaliero (non orario), con qualche giorno di
// ritardo per via del processo di validazione ARPA — normale, non un
// errore di ingestione.
//
// Come per il vento, cerchiamo dinamicamente una stazione per
// provincia (per nome contenente il capoluogo) invece di ID fissi,
// perché non sappiamo a priori quali stazioni saranno presenti nei
// dati più recenti.
// ---------------------------------------------------------------------

const ARIA_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/qp5k-6pvm.json";
const SOGLIA_PM10_UGM3 = 50; // limite giornaliero di legge

async function ingestQualitaAria() {
  const url = `${ARIA_DATASET_URL}?$order=data_misura DESC&$limit=300`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Dataset qualità aria non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset qualità aria vuoto");
    return;
  }

  // I dati più recenti disponibili (tutte le stazioni misurate quel giorno)
  const dataPiuRecente = rows[0].data_misura;
  const righeRecenti = rows.filter((r) => r.data_misura === dataPiuRecente);

  const NOMI_CITTA_PROVINCIA = { trieste: "Trieste", udine: "Udine", gorizia: "Gorizia", pordenone: "Pordenone" };

  const perProvincia = {};
  for (const provincia of Object.keys(NOMI_CITTA_PROVINCIA)) {
    const nomeCitta = NOMI_CITTA_PROVINCIA[provincia];
    const riga = righeRecenti.find((r) =>
      r.ubicazione?.toLowerCase().includes(nomeCitta.toLowerCase())
    );
    if (!riga) continue;

    const media = riga.media_giornaliera ? Number(riga.media_giornaliera) : null;
    perProvincia[provincia] = {
      stazione: riga.ubicazione,
      media_giornaliera: media,
      superamento: media !== null ? media > SOGLIA_PM10_UGM3 : null,
      dati_insufficienti: riga.dati_insuff === "True",
    };
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessuna stazione PM10 trovata per le 4 province");
    return;
  }

  await upsertSnapshot("aria:pm10", "aria", null, {
    data_misura: dataPiuRecente,
    soglia_ugm3: SOGLIA_PM10_UGM3,
    per_provincia: perProvincia,
  });
  console.log(`Qualità aria aggiornata (${Object.keys(perProvincia).length} province):`, dataPiuRecente);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// VOLI TRIESTE AIRPORT — scraping HTML, stesso approccio degli eventi:
// la pagina è renderizzata server-side (verificato), niente browser
// headless necessario. Struttura HTML verificata manualmente via
// devtools — se il sito cambia layout, questo parser andrà aggiornato.
// ---------------------------------------------------------------------

async function ingestVoli() {
  const res = await fetch("https://triesteairport.it/it/airport/voli-e-destinazioni/voli-in-tempo-reale/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`Pagina voli non disponibile (HTTP ${res.status})`);
    return;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const aggiornatoAlTesto = $(".updated-date").first().text().replace("Ultimo aggiornamento:", "").trim();

  const risultato = { partenze: [], arrivi: [] };
  $("table").each((_, table) => {
    const titolo = $(table).prevAll("h3").first().text().trim().toLowerCase();
    const chiave = titolo.includes("arriv") ? "arrivi" : titolo.includes("parten") ? "partenze" : null;
    if (!chiave) return;

    const righe = $(table).find("tr").slice(1); // salta l'intestazione (th)
    righe.each((_, tr) => {
      const celle = $(tr).find("td");
      if (celle.length < 5) return;
      risultato[chiave].push({
        volo: $(celle[0]).text().trim().replace(/\s+/g, " "),
        luogo: $(celle[1]).text().trim(),
        previsto: $(celle[2]).text().trim(),
        effettivo: $(celle[3]).text().trim(),
        note: $(celle[4]).text().trim(),
      });
    });
  });

  if (risultato.partenze.length === 0 && risultato.arrivi.length === 0) {
    console.warn("Nessun volo estratto — la struttura HTML della pagina potrebbe essere cambiata");
    return;
  }

  await upsertSnapshot("voli:trieste-airport", "voli", "C", {
    aggiornato_al_testo: aggiornatoAlTesto,
    aggiornato_al: new Date().toISOString(),
    ...risultato,
  });
  console.log(
    `Voli aggiornati: ${risultato.partenze.length} partenze, ${risultato.arrivi.length} arrivi`
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// PIOGGIA — stessa API PC FVG, stesse 4 stazioni già verificate per il
// vento (probabile abbiano anche il sensore pioggia, essendo stazioni
// meteo complete). Sensori risolti dinamicamente come per il vento.
// ---------------------------------------------------------------------

const CODICI_SENSORE_PIOGGIA = {
  ultimaOra: "P_1h",
  ultime24Ore: "Prec_24_ore",
};

async function ingestPioggiaProvincia(provincia, stationId, nomeStazione, zona) {
  const sensori = await sensoriStazione(stationId);
  const trovaId = (codice) => sensori.find((s) => s.code === codice)?.id ?? null;

  const idOra = trovaId(CODICI_SENSORE_PIOGGIA.ultimaOra);
  const id24Ore = trovaId(CODICI_SENSORE_PIOGGIA.ultime24Ore);
  if (!idOra && !id24Ore) {
    console.warn(`Stazione "${nomeStazione}" (${provincia}) non ha sensori pioggia — salto`);
    return;
  }

  const [ultimaOra, ultime24Ore] = await Promise.all([
    idOra ? ultimaMisura(stationId, idOra) : null,
    id24Ore ? ultimaMisura(stationId, id24Ore) : null,
  ]);

  if (!ultimaOra && !ultime24Ore) {
    console.warn(`Nessuna misura pioggia disponibile per "${nomeStazione}" (${provincia})`);
    return;
  }

  const payload = {
    stazione: nomeStazione,
    aggiornato_al: (ultimaOra || ultime24Ore).dt,
    pioggia_1h_mm: ultimaOra?.value ?? null,
    pioggia_24h_mm: ultime24Ore?.value ?? null,
  };

  await upsertSnapshot(`pioggia:${provincia}`, "pioggia", zona, payload);
  console.log(`Pioggia aggiornata (${provincia}):`, payload.pioggia_24h_mm, "mm/24h");
}

async function ingestPioggia() {
  const ZONA_PER_PROVINCIA = { trieste: "C", udine: "B", gorizia: "C", pordenone: "A" };
  const nomiStazioni = { trieste: "Trieste", udine: "Udine S+M", gorizia: "Gorizia aeroporto", pordenone: "Pordenone meteo" };

  await Promise.all(
    Object.entries(STAZIONE_VENTO_PER_PROVINCIA).map(([provincia, stationId]) =>
      ingestPioggiaProvincia(provincia, stationId, nomiStazioni[provincia], ZONA_PER_PROVINCIA[provincia])
    )
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// TEMPERATURA LIVE — stessa API PC FVG, stesse 4 stazioni di vento e
// pioggia (sensore "T"). A differenza del bollettino OSMER, questa
// fonte ha licenza CC BY 4.0 esplicita e non è soggetta al vincolo
// delle 24h sui dati real-time — possiamo mostrare la temperatura
// "adesso" legittimamente.
// ---------------------------------------------------------------------

async function ingestTemperaturaProvincia(provincia, stationId, nomeStazione, zona) {
  const sensori = await sensoriStazione(stationId);
  const idTemp = sensori.find((s) => s.code === "T")?.id ?? null;
  if (!idTemp) {
    console.warn(`Stazione "${nomeStazione}" (${provincia}) non ha un sensore temperatura — salto`);
    return;
  }

  const misura = await ultimaMisura(stationId, idTemp);
  if (!misura) {
    console.warn(`Nessuna misura temperatura disponibile per "${nomeStazione}" (${provincia})`);
    return;
  }

  await upsertSnapshot(`temperatura:${provincia}`, "temperatura", zona, {
    stazione: nomeStazione,
    aggiornato_al: misura.dt,
    temperatura_c: Math.round(misura.value * 10) / 10,
  });
  console.log(`Temperatura aggiornata (${provincia}):`, misura.value, "°C");
}

async function ingestTemperatura() {
  const ZONA_PER_PROVINCIA = { trieste: "C", udine: "B", gorizia: "C", pordenone: "A" };
  const nomiStazioni = { trieste: "Trieste", udine: "Udine S+M", gorizia: "Gorizia aeroporto", pordenone: "Pordenone meteo" };

  await Promise.all(
    Object.entries(STAZIONE_VENTO_PER_PROVINCIA).map(([provincia, stationId]) =>
      ingestTemperaturaProvincia(provincia, stationId, nomiStazioni[provincia], ZONA_PER_PROVINCIA[provincia])
    )
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// LIVELLI FIUMI — stessa API PC FVG, sensore "IDRO" (m). A differenza
// di vento/pioggia/temperatura, qui le stazioni NON sono le stesse 4
// meteo (i fiumi non passano per i capoluoghi) — stazioni idrometriche
// verificate singolarmente via /sensors: Gorizia idro (Isonzo),
// Latisana 1 idro (Tagliamento, provincia di Udine), Pordenone
// Noncello (il fiume che attraversa la città), Francovez Rosandra
// (Trieste non ha grandi fiumi, torrente Rosandra come rappresentante).
// ---------------------------------------------------------------------

const STAZIONE_IDRO_PER_PROVINCIA = {
  gorizia: { id: 66, nome: "Gorizia idro", fiume: "Isonzo" },
  udine: { id: 240, nome: "Latisana 1 idro", fiume: "Tagliamento" },
  pordenone: { id: 132, nome: "Pordenone Noncello", fiume: "Noncello" },
  trieste: { id: 602, nome: "Francovez Rosandra", fiume: "Rosandra" },
};

async function ingestFiumeProvincia(provincia, stazione, zona) {
  const sensori = await sensoriStazione(stazione.id);
  const idIdro = sensori.find((s) => s.code === "IDRO")?.id ?? null;
  if (!idIdro) {
    console.warn(`Stazione "${stazione.nome}" (${provincia}) non ha il sensore IDRO — salto`);
    return;
  }

  const misura = await ultimaMisura(stazione.id, idIdro);
  if (!misura) {
    console.warn(`Nessuna misura livello disponibile per "${stazione.nome}" (${provincia})`);
    return;
  }

  await upsertSnapshot(`fiume:${provincia}`, "fiume", zona, {
    stazione: stazione.nome,
    fiume: stazione.fiume,
    aggiornato_al: misura.dt,
    livello_m: Math.round(misura.value * 100) / 100,
  });
  console.log(`Livello fiume aggiornato (${provincia}, ${stazione.fiume}):`, misura.value, "m");
}

async function ingestFiumi() {
  const ZONA_PER_PROVINCIA = { trieste: "C", udine: "B", gorizia: "C", pordenone: "A" };

  await Promise.all(
    Object.entries(STAZIONE_IDRO_PER_PROVINCIA).map(([provincia, stazione]) =>
      ingestFiumeProvincia(provincia, stazione, ZONA_PER_PROVINCIA[provincia])
    )
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// LIVELLO MARE — stessa API PC FVG, sensore "LIV_MARE_IGM42" (m, datum
// geodetico IGM42). Rilevante soprattutto per Trieste (fenomeno
// dell'acqua alta), ma disponibile anche per Grado e Lignano — le 3
// stazioni costiere della regione. Sensore risolto dinamicamente per
// coerenza con gli altri moduli, anche se finora sempre con id 86.
// ---------------------------------------------------------------------

const STAZIONI_MARE = [
  { slug: "trieste", id: 502, nome: "Trieste" },
  { slug: "grado", id: 68, nome: "Grado" },
  { slug: "lignano", id: 77, nome: "Lignano" },
];

async function ingestMareStazione(stazione) {
  const sensori = await sensoriStazione(stazione.id);
  const idLivello = sensori.find((s) => s.code === "LIV_MARE_IGM42")?.id ?? null;
  if (!idLivello) {
    console.warn(`Stazione "${stazione.nome}" non ha il sensore livello mare — salto`);
    return;
  }

  const misura = await ultimaMisura(stazione.id, idLivello);
  if (!misura) {
    console.warn(`Nessuna misura livello mare disponibile per "${stazione.nome}"`);
    return;
  }

  await upsertSnapshot(`mare:${stazione.slug}`, "mare", null, {
    stazione: stazione.nome,
    aggiornato_al: misura.dt,
    livello_m: Math.round(misura.value * 100) / 100,
  });
  console.log(`Livello mare aggiornato (${stazione.nome}):`, misura.value, "m IGM42");
}

async function ingestMare() {
  await Promise.all(STAZIONI_MARE.map((s) => ingestMareStazione(s)));
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// QUALITÀ ARIA — OZONO — dataset "Aria - Ozono" (id 7vnx-28uy) sullo
// stesso portale Socrata del PM10. Il campo "rete" corrisponde
// direttamente al nome provincia (più affidabile del confronto per
// nome stazione usato per il PM10). Soglia di legge: 120 µg/m³ media
// mobile 8h (obiettivo di protezione della salute).
// ---------------------------------------------------------------------

const OZONO_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/7vnx-28uy.json";
const SOGLIA_OZONO_UGM3 = 120;

async function ingestOzono() {
  const url = `${OZONO_DATASET_URL}?$order=data_misura DESC&$limit=300`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Dataset ozono non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset ozono vuoto");
    return;
  }

  const dataPiuRecente = rows[0].data_misura;
  const righeRecenti = rows.filter((r) => r.data_misura === dataPiuRecente);

  const NOMI_RETE_PROVINCIA = { trieste: "Trieste", udine: "Udine", gorizia: "Gorizia", pordenone: "Pordenone" };

  const perProvincia = {};
  for (const [provincia, rete] of Object.entries(NOMI_RETE_PROVINCIA)) {
    const riga = righeRecenti.find((r) => r.rete === rete);
    if (!riga) continue;

    const media8h = riga.media_mobile_8h_max ? Number(riga.media_mobile_8h_max) : null;
    perProvincia[provincia] = {
      stazione: riga.ubicazione,
      media_mobile_8h_max: media8h !== null ? Math.round(media8h) : null,
      superamento: media8h !== null ? media8h > SOGLIA_OZONO_UGM3 : null,
      dati_insufficienti: riga.dati_insuff === "True",
    };
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessuna stazione ozono trovata per le 4 province");
    return;
  }

  await upsertSnapshot("aria:ozono", "aria", null, {
    data_misura: dataPiuRecente,
    soglia_ugm3: SOGLIA_OZONO_UGM3,
    per_provincia: perProvincia,
  });
  console.log(`Ozono aggiornato (${Object.keys(perProvincia).length} province):`, dataPiuRecente);
}

// ---------------------------------------------------------------------

async function main() {
  const risultati = await Promise.allSettled([
    ingestMeteo(),
    ingestNotizie(),
    ingestVento(),
    ingestViabilita(),
    ingestEventi(),
    ingestQualitaAria(),
    ingestVoli(),
    ingestPioggia(),
    ingestTemperatura(),
    ingestFiumi(),
    ingestMare(),
    ingestOzono(),
  ]);
  let fallito = false;
  risultati.forEach((r, i) => {
    if (r.status === "rejected") {
      fallito = true;
      console.error(`Job #${i} fallito:`, r.reason);
    }
  });
  if (fallito) process.exit(1);
}

main();
