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

// Le fonti esterne a volte hanno timeout transitori (visto con
// dati.friuliveneziagiulia.it: ETIMEDOUT). Un solo tentativo fallito
// non deve far cadere l'intero job — 2 retry con una breve pausa,
// usato per tutte le chiamate di rete dello script.
async function fetchConRetry(url, options = {}, tentativi = 3) {
  let ultimoErrore;
  for (let i = 0; i < tentativi; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      ultimoErrore = err;
      if (i < tentativi - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw ultimoErrore;
}
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
  let res = await fetchConRetry(`https://dev.meteo.fvg.it/xml/previsioni/PW${oggi}.xml`);
  if (!res.ok) {
    console.warn(`Bollettino di oggi (${oggi}) non disponibile, provo con quello di ieri (${dataIeriStr})`);
    res = await fetchConRetry(`https://dev.meteo.fvg.it/xml/previsioni/PW${dataIeriStr}.xml`);
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
  const res = await fetchConRetry(url);
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
  const res = await fetchConRetry(`${PC_API_BASE}/stations/${stationId}/sensors`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.sensors ?? [];
}

async function ultimaMisura(stationId, sensorId) {
  const res = await fetchConRetry(`${PC_API_BASE}/stations/${stationId}/sensors/${sensorId}/measures/latest`);
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

  const res = await fetchConRetry(url);
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
  const res = await fetchConRetry("https://www.turismofvg.it/eventi", {
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
  const res = await fetchConRetry(url);
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
  const res = await fetchConRetry("https://triesteairport.it/it/airport/voli-e-destinazioni/voli-in-tempo-reale/", {
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
  const res = await fetchConRetry(url);
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

  const NOMI_CITTA_PROVINCIA = { trieste: "Trieste", udine: "Udine", gorizia: "Gorizia", pordenone: "Pordenone" };

  const perProvincia = {};
  for (const [provincia, nomeCitta] of Object.entries(NOMI_CITTA_PROVINCIA)) {
    const riga = righeRecenti.find((r) => r.ubicazione?.toLowerCase().includes(nomeCitta.toLowerCase()));
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

// ---------------------------------------------------------------------
// QUALITÀ ARIA — BIOSSIDO DI AZOTO (NO2) — dataset "Aria - Biossido
// d'Azoto" (id ke9b-p6z2), stesso portale Socrata. Soglia di legge:
// 200 µg/m³ media oraria massima. Stesso approccio di match per nome
// città in "ubicazione" usato per ozono e PM10 (niente campo "rete"
// nei dati recenti).
// ---------------------------------------------------------------------

const NO2_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/ke9b-p6z2.json";
const SOGLIA_NO2_UGM3 = 200;

async function ingestNo2() {
  const url = `${NO2_DATASET_URL}?$order=data_misura DESC&$limit=300`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Dataset NO2 non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset NO2 vuoto");
    return;
  }

  const dataPiuRecente = rows[0].data_misura;
  const righeRecenti = rows.filter((r) => r.data_misura === dataPiuRecente);

  const NOMI_CITTA_PROVINCIA = { trieste: "Trieste", udine: "Udine", gorizia: "Gorizia", pordenone: "Pordenone" };

  const perProvincia = {};
  for (const [provincia, nomeCitta] of Object.entries(NOMI_CITTA_PROVINCIA)) {
    const riga = righeRecenti.find((r) => r.ubicazione?.toLowerCase().includes(nomeCitta.toLowerCase()));
    if (!riga) continue;

    const media = riga.media_oraria_max ? Number(riga.media_oraria_max) : null;
    perProvincia[provincia] = {
      stazione: riga.ubicazione,
      media_oraria_max: media !== null ? Math.round(media) : null,
      superamento: media !== null ? media > SOGLIA_NO2_UGM3 : null,
      dati_insufficienti: riga.dati_insuff === "True",
    };
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessuna stazione NO2 trovata per le 4 province");
    return;
  }

  await upsertSnapshot("aria:no2", "aria", null, {
    data_misura: dataPiuRecente,
    soglia_ugm3: SOGLIA_NO2_UGM3,
    per_provincia: perProvincia,
  });
  console.log(`NO2 aggiornato (${Object.keys(perProvincia).length} province):`, dataPiuRecente);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// QUALITÀ ARIA — PM2.5 — dataset "Aria - Particelle Sospese PM2.5"
// (id d63p-pqpr), stessa struttura del PM10. La normativa italiana
// fissa solo un limite ANNUALE per il PM2.5 (25 µg/m³), non uno
// giornaliero — usiamo quindi la linea guida OMS per le 24h
// (15 µg/m³) come riferimento indicativo, non un vero limite di legge.
// ---------------------------------------------------------------------

const PM25_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/d63p-pqpr.json";
const SOGLIA_PM25_OMS_UGM3 = 15;

async function ingestPm25() {
  const url = `${PM25_DATASET_URL}?$order=data_misura DESC&$limit=300`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Dataset PM2.5 non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset PM2.5 vuoto");
    return;
  }

  const dataPiuRecente = rows[0].data_misura;
  const righeRecenti = rows.filter((r) => r.data_misura === dataPiuRecente);

  const NOMI_CITTA_PROVINCIA = { trieste: "Trieste", udine: "Udine", gorizia: "Gorizia", pordenone: "Pordenone" };

  const perProvincia = {};
  for (const [provincia, nomeCitta] of Object.entries(NOMI_CITTA_PROVINCIA)) {
    const riga = righeRecenti.find((r) => r.ubicazione?.toLowerCase().includes(nomeCitta.toLowerCase()));
    if (!riga) continue;

    const media = riga.media_giornaliera ? Number(riga.media_giornaliera) : null;
    perProvincia[provincia] = {
      stazione: riga.ubicazione,
      media_giornaliera: media,
      superamento_oms: media !== null ? media > SOGLIA_PM25_OMS_UGM3 : null,
      dati_insufficienti: riga.dati_insuff === "True",
    };
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessuna stazione PM2.5 trovata per le 4 province");
    return;
  }

  await upsertSnapshot("aria:pm25", "aria", null, {
    data_misura: dataPiuRecente,
    soglia_oms_ugm3: SOGLIA_PM25_OMS_UGM3,
    per_provincia: perProvincia,
  });
  console.log(`PM2.5 aggiornato (${Object.keys(perProvincia).length} province):`, dataPiuRecente);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// CALCIO — Eccellenza FVG Girone A (gare.lnd.it). La pagina è
// un'app Inertia.js: al primo caricamento normale (nessun header
// speciale necessario) incorpora l'intero stato in un tag
// <script data-page="app" type="application/json"> — lo estraiamo
// con cheerio invece di scrapare l'HTML visibile, stesso principio
// degli altri moduli ma sorgente diversa (JSON incorporato).
//
// Per ora solo Eccellenza Girone A (il livello regionale più seguito).
// Altri campionati (Promozione, Prima Categoria, ecc.) hanno la
// stessa struttura URL — estendibile in futuro aggiungendo altre
// voci a COMPETIZIONI_CALCIO.
// ---------------------------------------------------------------------

const COMPETIZIONI_CALCIO = [
  { slug: "eccellenza-a", nome: "Eccellenza", girone: "Girone A", url: "https://gare.lnd.it/?campionato=EC&girone=A&stagione=2025&cr=07" },
  { slug: "promozione-a", nome: "Promozione", girone: "Girone A", url: "https://gare.lnd.it/?campionato=PR&girone=A&stagione=2025&cr=07" },
  { slug: "prima-categoria-a", nome: "Prima Categoria", girone: "Girone A", url: "https://gare.lnd.it/?campionato=1C&girone=A&stagione=2025&cr=07" },
  { slug: "prima-categoria-b", nome: "Prima Categoria", girone: "Girone B", url: "https://gare.lnd.it/?campionato=1C&girone=B&stagione=2025&cr=07" },
  { slug: "prima-categoria-c", nome: "Prima Categoria", girone: "Girone C", url: "https://gare.lnd.it/?campionato=1C&girone=C&stagione=2025&cr=07" },
  { slug: "seconda-categoria-gorizia", nome: "Seconda Categoria Gorizia", girone: "Girone D", url: "https://gare.lnd.it/?campionato=22&girone=D&stagione=2025&cr=07" },
  { slug: "seconda-categoria-pordenone", nome: "Seconda Categoria Pordenone", girone: "Girone A", url: "https://gare.lnd.it/?campionato=23&girone=A&stagione=2025&cr=07" },
  { slug: "seconda-categoria-udine-b", nome: "Seconda Categoria Udine", girone: "Girone B", url: "https://gare.lnd.it/?campionato=26&girone=B&stagione=2025&cr=07" },
  { slug: "seconda-categoria-udine-c", nome: "Seconda Categoria Udine", girone: "Girone C", url: "https://gare.lnd.it/?campionato=26&girone=C&stagione=2025&cr=07" },
];

async function ingestCalcioCompetizione(comp) {
  const res = await fetchConRetry(comp.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`Pagina calcio "${comp.nome}" non disponibile (HTTP ${res.status})`);
    return;
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const scriptTag = $('script[data-page="app"]').first().html();
  if (!scriptTag) {
    console.warn(`Tag dati non trovato per "${comp.nome}" — la struttura della pagina potrebbe essere cambiata`);
    return;
  }

  let dati;
  try {
    dati = JSON.parse(scriptTag);
  } catch {
    console.warn(`JSON non valido per "${comp.nome}"`);
    return;
  }

  const props = dati.props;
  const partite = (props.matches || []).map((m) => ({
    casa: m.home,
    ospite: m.away,
    golCasa: m.homeGoals,
    golOspite: m.awayGoals,
    data: m.date,
    ora: m.time,
    campo: m.field,
    logoCasa: m.homeLogo,
    logoOspite: m.awayLogo,
    inCorso: m.isLive,
  }));

  const classifica = (props.standings || []).map((s) => ({
    posizione: s.position,
    squadra: s.team,
    logo: s.logo,
    punti: s.points,
    giocate: s.played,
    vittorie: s.wins,
    pareggi: s.draws,
    sconfitte: s.losses,
    golFatti: s.goalsFor,
    golSubiti: s.goalsAgainst,
  }));

  await upsertSnapshot(`calcio:${comp.slug}`, "calcio", null, {
    campionato: comp.nome,
    girone: comp.girone,
    giornata_corrente: props.currentMatchday || null,
    partite,
    classifica,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Calcio aggiornato (${comp.nome} ${comp.girone}): ${partite.length} partite, ${classifica.length} squadre`);
}

async function ingestCalcio() {
  await Promise.all(COMPETIZIONI_CALCIO.map((c) => ingestCalcioCompetizione(c)));
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// BASKET — fip.it/risultati (Federazione Italiana Pallacanestro).
// A differenza di gare.lnd.it, qui i dati sono già presenti nell'HTML
// servito dal server (nessun tag JSON incorporato) — scraping diretto
// con cheerio, struttura verificata manualmente via devtools.
//
// Nota: l'URL usato non specifica un girone/comitato esplicito come
// per il calcio — la pagina mostra un default (al momento: Trieste,
// Serie C/Divisione Regionale 1, Girone D) che potrebbe cambiare nel
// tempo lato FIP. Se in futuro i dati non tornano coerenti, va
// verificato se l'URL richiede parametri più specifici.
// ---------------------------------------------------------------------

const COMPETIZIONI_BASKET = [
  {
    slug: "trieste-serie-c",
    nome: "Serie C — Divisione Regionale 1",
    girone: "Girone D",
    url: "https://fip.it/risultati/?group=campionati-regionali&regione_codice=FR&comitato_codice=RFR",
  },
];

async function ingestBasketCompetizione(comp) {
  const res = await fetchConRetry(comp.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`Pagina basket "${comp.nome}" non disponibile (HTTP ${res.status})`);
    return;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const partite = [];
  $(".results-matches__match").each((_, el) => {
    const squadre = $(el).find(".teams .team");
    if (squadre.length < 2) return;
    const casa = $(squadre[0]).find(".team__name").text().trim();
    const ospite = $(squadre[1]).find(".team__name").text().trim();
    const puntiCasa = $(squadre[0]).find(".team__points").text().trim();
    const puntiOspite = $(squadre[1]).find(".team__points").text().trim();
    const data = $(el).find(".date").first().text().trim();
    const ora = $(el).find(".time").first().text().trim();
    if (casa && ospite) {
      partite.push({
        casa,
        ospite,
        puntiCasa: puntiCasa || null,
        puntiOspite: puntiOspite || null,
        data,
        ora,
      });
    }
  });

  const classifica = [];
  $(".results-tab.results-ranking-full table tbody tr").each((_, tr) => {
    const celle = $(tr).find("td");
    if (celle.length < 8) return;
    classifica.push({
      posizione: $(celle[0]).text().trim(),
      squadra: $(celle[1]).find(".team__name").text().trim(),
      punti: $(celle[2]).text().trim(),
      giocate: $(celle[3]).text().trim(),
      vittorie: $(celle[4]).text().trim(),
      sconfitte: $(celle[5]).text().trim(),
      puntiFatti: $(celle[6]).text().trim(),
      puntiSubiti: $(celle[7]).text().trim(),
    });
  });

  if (partite.length === 0 && classifica.length === 0) {
    console.warn(`Nessun dato basket estratto per "${comp.nome}" — la struttura HTML potrebbe essere cambiata`);
    return;
  }

  await upsertSnapshot(`basket:${comp.slug}`, "basket", null, {
    campionato: comp.nome,
    girone: comp.girone,
    partite,
    classifica,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Basket aggiornato (${comp.nome} ${comp.girone}): ${partite.length} partite, ${classifica.length} squadre`);
}

async function ingestBasket() {
  await Promise.all(COMPETIZIONI_BASKET.map((c) => ingestBasketCompetizione(c)));
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// BASEBALL — live.baseballfvg.it (sito dell'utente stesso, con due
// route API dedicate create apposta per FVG Monitor). Nessuna
// protezione anti-bot, fetch semplice — a differenza del tentativo
// iniziale con fibs.it direttamente (bloccato con HTTP 403).
//
// Le competizioni vengono scoperte dinamicamente dalla risposta del
// calendario (filtrata fvg=true) invece di essere elencate a mano,
// dato che coprono sia baseball che softball con squadre FVG diverse.
// ---------------------------------------------------------------------

const BASEBALLFVG_BASE = "https://live.baseballfvg.it/api";

async function ingestBaseballFvg() {
  const res = await fetchConRetry(`${BASEBALLFVG_BASE}/calendario?sport=all&fvg=true`);
  if (!res.ok) {
    console.warn(`Calendario baseball FVG non disponibile (HTTP ${res.status})`);
    return;
  }

  const { games } = await res.json();
  if (!Array.isArray(games) || games.length === 0) {
    console.warn("Nessuna partita trovata sul calendario baseball FVG");
    return;
  }

  // Raggruppa le partite per competizione (id univoco lato sorgente)
  const competizioni = new Map();
  for (const g of games) {
    const id = g.competition?.id;
    if (!id) continue;
    if (!competizioni.has(id)) {
      competizioni.set(id, { id, nome: g.competition.name, sport: g.competition.sport, partite: [] });
    }
    competizioni.get(id).partite.push(g);
  }

  for (const comp of competizioni.values()) {
    const partiteRecenti = comp.partite
      .slice()
      .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
      .slice(0, 10)
      .map((g) => ({
        casa: g.homeTeam?.name ?? "?",
        casaFvg: !!g.homeTeam?.isFvg,
        ospite: g.awayTeam?.name ?? "?",
        ospiteFvg: !!g.awayTeam?.isFvg,
        punteggioCasa: g.homeScore,
        punteggioOspite: g.awayScore,
        data: g.startsAt,
        stato: g.status,
        luogo: g.venue,
      }));

    let classifica = [];
    try {
      const resClass = await fetchConRetry(`${BASEBALLFVG_BASE}/classifiche?competition=${comp.id}`);
      if (resClass.ok) {
        const { rows } = await resClass.json();
        classifica = (rows || []).map((r) => ({
          girone: r.groupName,
          posizione: r.position,
          squadra: r.team?.name ?? "?",
          squadraFvg: !!r.team?.isFvg,
          vittorie: r.wins,
          sconfitte: r.losses,
          percentuale: r.percentage,
          partiteDietro: r.gamesBehind,
        }));
      } else {
        console.warn(`Classifica baseball "${comp.nome}" non disponibile (HTTP ${resClass.status})`);
      }
    } catch (err) {
      console.warn(`Errore classifica baseball "${comp.nome}": ${err.message}`);
    }

    await upsertSnapshot(`baseball:${comp.id}`, "baseball", null, {
      campionato: comp.nome,
      sport: comp.sport,
      partite: partiteRecenti,
      classifica,
      aggiornato_al: new Date().toISOString(),
    });
    console.log(`Baseball aggiornato (${comp.nome}): ${partiteRecenti.length} partite, ${classifica.length} squadre in classifica`);
  }
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------

// Nota: le allerte Protezione Civile NON vengono più ingerite qui.
// L'endpoint (pianiemergenza.protezionecivile.fvg.it) risulta bloccato
// in modo persistente per le richieste da GitHub Actions (timeout di
// connessione TCP puro, confermato su più tentativi anche a sito
// raggiungibile normalmente da browser) — probabile blocco specifico
// verso indirizzi IP cloud/datacenter. Spostato interamente lato
// client (vedi lib/allerte.ts + lib/jsonp.ts): i componenti React
// interrogano l'endpoint JSONP direttamente dal browser di chi visita
// il sito, esattamente come fa già il widget ufficiale — bypassa il
// blocco perché usa l'indirizzo IP del visitatore, non quello di
// GitHub Actions.

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// WEBCAM OSMER — osmer.fvg.it/webcam_img.php. Licenza CC BY-SA 3.0
// esplicita. OSMER fa da specchio/proxy delle immagini di terze parti
// sul proprio dominio (data-src relativo) — mostriamo quelle, comode
// perché su un unico dominio invece di tante fonti diverse.
//
// Le "zone geografiche" di OSMER non coincidono sempre con i confini
// provinciali (es. "Costa ovest e Laguna" include sia Grado, provincia
// di Gorizia, sia Lignano, provincia di Udine) — usiamo una mappa
// comune→provincia il più precisa possibile, con fallback sulla zona
// quando il nome non è riconosciuto. Approssimazione nota e accettata.
//
// Escluse le zone fuori regione (Veneto, Austria, Slovenia, Croazia) —
// non pertinenti per un sito di webcam "regionali" FVG.
// ---------------------------------------------------------------------

const OSMER_ZONE_FVG = new Set([
  "Alpi_Carniche",
  "Alpi_Giulie",
  "Prealpi_Carniche",
  "Prealpi_Giulie",
  "Pianura_Pordenonese",
  "Pianura_Udinese",
  "Pianura_Goriziana",
  "Costa_ovest_e_Laguna",
  "Carso_e_Trieste",
  "A4",
  "A23",
  "A28",
  "SR354",
]);

// Fallback quando il nome della webcam non contiene un comune riconosciuto
const OSMER_ZONA_PROVINCIA_FALLBACK = {
  Alpi_Carniche: "udine",
  Alpi_Giulie: "udine",
  Prealpi_Carniche: "pordenone",
  Prealpi_Giulie: "udine",
  Pianura_Pordenonese: "pordenone",
  Pianura_Udinese: "udine",
  Pianura_Goriziana: "gorizia",
  Costa_ovest_e_Laguna: "udine",
  Carso_e_Trieste: "trieste",
  A4: "udine",
  A23: "udine",
  A28: "pordenone",
  SR354: "udine",
};

// Comuni riconosciuti nel nome della webcam → provincia (più precisa
// del fallback per zona, dove disponibile)
const OSMER_COMUNE_PROVINCIA = {
  sappada: "udine", "arta terme": "udine", ampezzo: "udine", enemonzo: "udine",
  "forni avoltri": "udine", "forni di sopra": "udine", liariis: "udine",
  "monte tenchia": "udine", zoncolan: "udine", zoufplan: "udine",
  "passo monte croce carnico": "udine", paularo: "udine", ravascletto: "udine",
  "val pesarina": "udine", montasio: "udine", "monte acomizza": "udine",
  "monte canin": "udine", lussari: "udine", pramollo: "udine", planica: "udine",
  "sella nevea": "udine", tarvisio: "udine", matajur: "udine", resia: "udine",
  tarcento: "udine", bordano: "udine", "lago di cavazzo": "udine", verzegnis: "udine",
  barcis: "pordenone", budoia: "pordenone", cansiglio: "pordenone",
  cimolais: "pordenone", claut: "pordenone", piancavallo: "pordenone",
  polcenigo: "pordenone", fontanafredda: "pordenone", maniago: "pordenone",
  sacile: "pordenone", "san vito al tagliamento": "pordenone", spilimbergo: "pordenone",
  zoppola: "pordenone", "sesto al reghena": "pordenone", "azzano": "pordenone",
  brugnera: "pordenone", pordenone: "pordenone",
  aquileia: "udine", basiliano: "udine", bertiolo: "udine", carlino: "udine",
  cervignano: "udine", cividale: "udine", gemona: "udine", martignacco: "udine",
  moruzzo: "udine", ragogna: "udine", osoppo: "udine", "san daniele": "udine",
  udine: "udine", gonars: "udine", latisana: "udine", palmanova: "udine",
  cormons: "gorizia", gorizia: "gorizia", "ronchi dei legionari": "gorizia",
  grado: "gorizia", monfalcone: "gorizia", lisert: "gorizia",
  lignano: "udine",
  "duino aurisina": "trieste", trieste: "trieste", sistiana: "trieste",
};

function provinciaWebcam(nome, zonaId) {
  const nomeLower = nome.toLowerCase();
  for (const [comune, provincia] of Object.entries(OSMER_COMUNE_PROVINCIA)) {
    if (nomeLower.includes(comune)) return provincia;
  }
  return OSMER_ZONA_PROVINCIA_FALLBACK[zonaId] ?? null;
}

async function ingestWebcamOsmer() {
  const res = await fetchConRetry("https://www.osmer.fvg.it/webcam_img.php?ln=", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`Pagina webcam OSMER non disponibile (HTTP ${res.status})`);
    return;
  }

  const $ = cheerio.load(await res.text());
  const webcam = [];

  $("div[id]").each((_, headerEl) => {
    const zonaId = $(headerEl).attr("id");
    if (!OSMER_ZONE_FVG.has(zonaId)) return; // salta le zone fuori regione

    const zonaNome = zonaId.replace(/_/g, " ");
    const siblings = $(headerEl).nextUntil("div[id]");

    siblings.find(".lazy-container").each((_, camEl) => {
      const nome = $(camEl).find(".panel-heading").first().text().trim();
      const img = $(camEl).find("img").first();
      const dataSrc = img.attr("data-src");
      if (!nome || !dataSrc) return;

      webcam.push({
        link: img.attr("data-url") || null,
        nome,
        zona: zonaNome,
        provincia: provinciaWebcam(nome, zonaId),
        immagine: `https://www.osmer.fvg.it/${dataSrc}`,
        descrizione: img.attr("data-desc") || null,
      });
    });
  });

  if (webcam.length === 0) {
    console.warn("Nessuna webcam OSMER estratta — la struttura HTML potrebbe essere cambiata");
    return;
  }

  await upsertSnapshot("webcam:osmer", "webcam", null, {
    webcam,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Webcam OSMER aggiornate: ${webcam.length} trovate`);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// RADAR METEO — stessa API PC FVG (monitor.protezionecivile.fvg.it),
// gruppo "radar" mai usato prima. Solo il radar di Fossalon (id 1) è
// attivo al momento (Lussari e Mosaico risultano spenti, status "X").
//
// Prodotto scelto: "SRTLBM_1" formato PNG — mappa colorata
// dell'intensità di pioggia (mm), quella che corrisponde all'idea
// comune di "radar meteo". Altri prodotti disponibili sullo stesso
// radar (velocità Doppler, classificazione idrometeore, ecc.) restano
// per ora non utilizzati.
//
// Salviamo solo l'URL dell'immagine (l'API la serve direttamente come
// PNG binario) — nessun bisogno di scaricare/ricodificare i byte,
// il tag <img> del browser la richiede direttamente dall'API PC FVG.
// ---------------------------------------------------------------------

async function ingestRadarMeteo() {
  const ora = new Date();
  const daOra = new Date(ora.getTime() - 30 * 60 * 1000); // ultimi 30 minuti
  const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");

  const url = `${PC_API_BASE}/radars/1/products?from=${encodeURIComponent(fmt(daOra))}&to=${encodeURIComponent(fmt(ora))}`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Radar meteo non disponibile (HTTP ${res.status})`);
    return;
  }

  const json = await res.json();
  const prodotti = json.products || [];
  const candidati = prodotti.filter((p) => p.name === "SRTLBM_1" && p.format === "image/png");
  if (candidati.length === 0) {
    console.warn("Nessuna immagine radar (SRTLBM_1) trovata negli ultimi 30 minuti");
    return;
  }

  const piuRecente = candidati.sort((a, b) => new Date(b.dt) - new Date(a.dt))[0];

  // details.extent è [minLon, maxLat, maxLon, minLat] — i confini
  // geografici esatti dell'immagine, necessari per sovrapporla a una
  // vera mappa (l'immagine stessa è trasparente fuori dalle zone di
  // pioggia, senza base geografica non si capisce cosa si sta vedendo)
  const extent = piuRecente.details?.extent ?? null;

  await upsertSnapshot("radar:fossalon", "radar", null, {
    immagine: `${PC_API_BASE}/products/${piuRecente.id}`,
    extent,
    aggiornato_al: piuRecente.dt,
  });
  console.log(`Radar meteo aggiornato: ${piuRecente.dt}`);
}

// ---------------------------------------------------------------------

async function main() {
  const jobs = [
    ["meteo", ingestMeteo()],
    ["notizie", ingestNotizie()],
    ["vento", ingestVento()],
    ["viabilita", ingestViabilita()],
    ["eventi", ingestEventi()],
    ["qualita-aria", ingestQualitaAria()],
    ["voli", ingestVoli()],
    ["pioggia", ingestPioggia()],
    ["temperatura", ingestTemperatura()],
    ["fiumi", ingestFiumi()],
    ["mare", ingestMare()],
    ["ozono", ingestOzono()],
    ["no2", ingestNo2()],
    ["pm25", ingestPm25()],
    ["calcio", ingestCalcio()],
    ["basket", ingestBasket()],
    ["baseball", ingestBaseballFvg()],
    ["webcam-osmer", ingestWebcamOsmer()],
    ["radar-meteo", ingestRadarMeteo()],
  ];

  const risultati = await Promise.allSettled(jobs.map(([, p]) => p));

  let falliti = 0;
  risultati.forEach((r, i) => {
    if (r.status === "rejected") {
      falliti++;
      console.error(`Job "${jobs[i][0]}" fallito:`, r.reason);
    }
  });

  const totale = risultati.length;
  if (falliti > 0) {
    console.warn(`${falliti}/${totale} moduli falliti — vedi sopra per i dettagli.`);
  }

  // L'esecuzione fallisce (rosso su GitHub Actions) solo se TUTTI i
  // moduli sono falliti — quasi certamente un problema serio e comune
  // a tutti (es. credenziali Supabase rotte), non il blocco di rete
  // su una singola fonte. Se anche solo un modulo va a buon fine, i
  // dati continuano ad aggiornarsi correttamente per tutto il resto.
  if (falliti === totale) {
    console.error("Tutti i moduli sono falliti — interrompo con errore.");
    process.exit(1);
  }
}

main();
