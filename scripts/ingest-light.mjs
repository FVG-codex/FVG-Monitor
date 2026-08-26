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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
//
// TIMEOUT_MS_DEFAULT (aggiunto il 26/08/2026): senza un timeout
// esplicito, il fetch nativo di Node aspetta diversi minuti prima di
// arrendersi da solo su un server che accetta la connessione ma non
// risponde mai — con ~40 chiamate sequenziali nello script (una fonte
// lenta/bloccata basta) un'esecuzione può superare l'intervallo del
// cron (15 minuti) e restare "in progress" molto più a lungo del
// normale, causando accumulo di esecuzioni in coda su GitHub Actions
// (vedi anche concurrency/timeout-minutes in
// .github/workflows/ingest-light.yml). 20 secondi per tentativo è
// abbondante per API/HTML di poche decine di KB come quelle usate qui.
const TIMEOUT_MS_DEFAULT = 20_000;

async function fetchConRetry(url, options = {}, tentativi = 3) {
  let ultimoErrore;
  for (let i = 0; i < tentativi; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS_DEFAULT);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      ultimoErrore = err;
      if (i < tentativi - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    } finally {
      clearTimeout(timer);
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

// Legge uno snapshot già salvato (se esiste) — usato dai moduli che
// mantengono una cache lato dati (es. risultati gare sci, vedi sotto)
// per non ripetere richieste HTTP già soddisfatte in un'esecuzione
// precedente. Mai fatale: se manca o la lettura fallisce si riparte da
// zero, il chiamante deve gestire `null` come "nessuna cache".
async function leggiSnapshotEsistente(id) {
  const { data, error } = await supabase.from("snapshots").select("data").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data.data ?? null;
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
// CARBURANTI — prezzo medio regionale, fonte ufficiale MIMIT
// (Ministero delle Imprese e del Made in Italy), CSV pubblicato ogni
// mattina alle 8:00 con i prezzi medi di tutte le regioni italiane.
// A differenza di quasi tutti gli altri moduli, qui il dato è
// UN SOLO VALORE per l'intera regione (non per provincia) — è così
// che il ministero lo pubblica, non una nostra semplificazione.
//
// Benzina e gasolio self-service (self è l'unica modalità rilevante
// per questi due in Italia), GPL alla modalità servito (idem, il GPL
// non si fa self in Italia) — il file riporta anche il metano
// (servito), non ingerito perché non richiesto, ma stessa riga/
// formato: estendibile in futuro aggiungendo un'altra voce a
// CARBURANTI_TIPI.
//
// Formato CSV non standard: prima riga "Aggiornamento DD-MM-YYYY",
// seconda riga intestazione, poi un blocco di 4 righe per regione
// (Gasolio/Benzina self, GPL/Metano servito) in ordine alfabetico —
// verificato manualmente, nessun bisogno di una libreria CSV per un
// formato così semplice (solo ";" come separatore, nessun campo
// quotato).
// ---------------------------------------------------------------------

const CARBURANTI_CSV_URL = "https://www.mimit.gov.it/images/stories/carburanti/MediaRegionaleStradale.csv";
const REGIONE_CARBURANTI = "Friuli Venezia Giulia";

const CARBURANTI_TIPI = [
  { chiave: "benzina", tipologia: "Benzina", erogazione: "SELF" },
  { chiave: "gasolio", tipologia: "Gasolio", erogazione: "SELF" },
  { chiave: "gpl", tipologia: "GPL", erogazione: "SERVITO" },
];

async function ingestCarburanti() {
  const res = await fetchConRetry(CARBURANTI_CSV_URL);
  if (!res.ok) {
    console.warn(`CSV prezzi carburanti MIMIT non disponibile (HTTP ${res.status})`);
    return;
  }

  const testo = await res.text();
  const righe = testo.split("\n").map((r) => r.trim()).filter(Boolean);
  if (righe.length < 2) {
    console.warn("CSV prezzi carburanti vuoto o troppo corto");
    return;
  }

  const matchData = righe[0].match(/(\d{2})-(\d{2})-(\d{4})/);
  const aggiornatoAl = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : null;

  const righeDati = righe.slice(2).map((r) => r.split(";")); // salta "Aggiornamento ..." e l'intestazione

  const carburanti = {};
  for (const t of CARBURANTI_TIPI) {
    const riga = righeDati.find(
      ([regione, tipologia, erogazione]) =>
        regione === REGIONE_CARBURANTI && tipologia === t.tipologia && erogazione === t.erogazione
    );
    if (!riga) {
      console.warn(`Riga ${t.tipologia} non trovata per "${REGIONE_CARBURANTI}" nel CSV MIMIT`);
      continue;
    }
    const prezzo = Number(riga[3]);
    if (!Number.isFinite(prezzo)) {
      console.warn(`Prezzo ${t.tipologia} non numerico nel CSV MIMIT: "${riga[3]}"`);
      continue;
    }
    carburanti[t.chiave] = {
      prezzo_medio_eur_litro: Math.round(prezzo * 1000) / 1000,
      erogazione: t.erogazione === "SELF" ? "self" : "servito",
    };
  }

  if (Object.keys(carburanti).length === 0) {
    console.warn("Nessun prezzo carburante trovato nel CSV MIMIT");
    return;
  }

  await upsertSnapshot("carburanti", "carburanti", null, {
    carburanti,
    aggiornato_al: aggiornatoAl,
  });
  console.log(
    `Prezzi medi carburanti FVG aggiornati (${Object.keys(carburanti).length}): ${aggiornatoAl}`
  );
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
    pioggia_1h_mm: ultimaOra?.value !== undefined && ultimaOra?.value !== null ? Math.round(ultimaOra.value * 10) / 10 : null,
    pioggia_24h_mm: ultime24Ore?.value !== undefined && ultime24Ore?.value !== null ? Math.round(ultime24Ore.value * 10) / 10 : null,
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
// BALNEAZIONE — qualità delle acque di balneazione, dataset Socrata
// "Acqua - Acque di Balneazione" (id fpj6-y9vk) su
// dati.friuliveneziagiulia.it, esiti dei prelievi ARPA FVG (rete
// ufficiale ex D.Lgs 116/2008). 66 punti di monitoraggio in tutta la
// regione, sia acque marino-costiere (mare) sia acque interne (laghi,
// fiumi torrenti) — non solo le 4 città capoluogo come quasi tutti gli
// altri moduli.
//
// Provincia ricavata dal codice `id_area_balneazione` stesso invece
// che dal nome (più affidabile, verificato manualmente sui 66 punti):
// formato "IT006" + codice provincia ISTAT a 3 cifre + comune + id
// progressivo, es. "IT006032001007" → 032 = Trieste. Codici FVG:
// 030 Udine, 031 Gorizia, 032 Trieste, 093 Pordenone.
//
// Esito "favorevole/sfavorevole" calcolato sul singolo prelievo più
// recente per ciascun punto, confrontando enterococchi intestinali ed
// Escherichia coli con i valori limite per singolo campione
// dell'Allegato A del D.Lgs 116/2008 (diversi tra acque marine e
// acque interne — verificati su testo del decreto e su una fonte
// indipendente per le sole acque marine, che coincide):
//   acque marino-costiere: enterococchi > 200 e/o E. coli > 500 UFC/100ml
//   acque interne:         enterococchi > 500 e/o E. coli > 1000 UFC/100ml
// Non è la classificazione stagionale eccellente/buona/sufficiente/
// scarsa (quella si basa sul 95°/90° percentile di 4 stagioni di
// prelievi, non riproducibile da qui) — è l'indicatore "si può fare il
// bagno adesso o no", lo stesso usato per i divieti temporanei
// comunali. Va comunque intesa come indicazione, non sostituisce
// un'eventuale ordinanza sindacale ufficiale.
//
// I valori dei parametri nel dataset sono stringhe tipo "< 10" (sotto
// il limite di rilevabilità) invece di numeri puri — estraiamo la
// parte numerica con una regex, sufficiente per il confronto con la
// soglia (un "< 10" è comunque ben sotto qualsiasi soglia rilevante).
// ---------------------------------------------------------------------

const BALNEAZIONE_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/fpj6-y9vk.json";

const PROVINCIA_DA_CODICE_ISTAT = { "030": "udine", "031": "gorizia", "032": "trieste", "093": "pordenone" };

const SOGLIE_BALNEAZIONE = {
  marine: { enterococchi: 200, ecoli: 500 },
  interne: { enterococchi: 500, ecoli: 1000 },
};

function parseValoreMicrobiologico(v) {
  if (v === null || v === undefined) return null;
  // Richiede almeno una cifra (non solo un punto) — valori come "N.D."
  // (non determinato) non devono essere interpretati come 0.
  const m = String(v).replace(",", ".").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function provinciaDaIdBalneazione(id) {
  const m = /^IT006(\d{3})/.exec(id ?? "");
  return m ? PROVINCIA_DA_CODICE_ISTAT[m[1]] ?? null : null;
}

async function ingestBalneazione() {
  const url = `${BALNEAZIONE_DATASET_URL}?$order=data DESC&$limit=1000`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Dataset balneazione non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset balneazione vuoto");
    return;
  }

  // Un solo prelievo per punto — il più recente (righe già ordinate
  // per data decrescente, teniamo la prima occorrenza di ogni id)
  const puntiPerId = new Map();
  for (const r of rows) {
    if (!r.id_area_balneazione || puntiPerId.has(r.id_area_balneazione)) continue;
    puntiPerId.set(r.id_area_balneazione, r);
  }

  const perProvincia = {};
  for (const r of puntiPerId.values()) {
    const provincia = provinciaDaIdBalneazione(r.id_area_balneazione);
    if (!provincia) continue; // punto fuori regione o codice non riconosciuto — non dovrebbe capitare

    const interna = r.categoria_acque?.toLowerCase().includes("interna") ?? false;
    const soglie = interna ? SOGLIE_BALNEAZIONE.interne : SOGLIE_BALNEAZIONE.marine;

    const enterococchi = parseValoreMicrobiologico(r.enterococchi_intestinali);
    const ecoli = parseValoreMicrobiologico(r.escherichia_coli);

    let esito = "nd";
    if (enterococchi !== null || ecoli !== null) {
      const supera =
        (enterococchi !== null && enterococchi > soglie.enterococchi) ||
        (ecoli !== null && ecoli > soglie.ecoli);
      esito = supera ? "sfavorevole" : "favorevole";
    }

    if (!perProvincia[provincia]) {
      perProvincia[provincia] = { totale: 0, favorevoli: 0, sfavorevoli: 0, nd: 0, punti_sfavorevoli: [], aggiornato_al: r.data };
    }
    const p = perProvincia[provincia];
    p.totale++;
    p[esito === "nd" ? "nd" : esito === "favorevole" ? "favorevoli" : "sfavorevoli"]++;
    if (esito === "sfavorevole") {
      p.punti_sfavorevoli.push({ nome: r.nome, enterococchi, ecoli, data: r.data });
    }
    if (r.data > p.aggiornato_al) p.aggiornato_al = r.data;
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessun punto di balneazione trovato");
    return;
  }

  await upsertSnapshot("balneazione", "balneazione", null, { per_provincia: perProvincia });
  const puntiSfavorevoli = Object.values(perProvincia).reduce((n, p) => n + p.sfavorevoli, 0);
  console.log(
    `Balneazione aggiornata: ${puntiPerId.size} punti, ${puntiSfavorevoli} sfavorevoli`
  );
}

// ---------------------------------------------------------------------
// FARMACIE — dataset Socrata "Farmacie di turno" (id jbxd-m6xe) su
// dati.friuliveneziagiulia.it: elenco completo delle farmacie aperte al
// pubblico in FVG, con le fasce di apertura straordinaria (turno) oltre
// a quelle ordinarie. Aggiornato dalla Regione ogni giorno alle 01:00,
// 417 farmacie totali. La finestra dati copre "oggi + domani mattina"
// (verificato: min/max di orari_0_da sono risultati rispettivamente
// oggi 00:00 e domani ~09:00 nello stesso giorno di interrogazione) —
// **non** una tabella oraria settimanale permanente: è uno snapshot che
// dà solo le fasce (normali e turno) di OGGI per ciascuna farmacia,
// aggiornato ogni giorno. Per questo l'orario "ordinario" mostrato in
// `/farmacie-tutte` (26/08/2026, vedi sotto) è "l'orario di oggi", non
// un orario settimanale fisso — la distinzione va tenuta chiara in UI,
// non è un dato inventato ma nemmeno un vero orario "Lun-Sab" completo.
//
// Ogni farmacia ha fino a 17 fasce orarie (orari_0_* … orari_16_*: campi
// *_da, *_a, *_tipo), con tipo "normale" (orario ordinario) o "turno"
// (apertura straordinaria: sabato pomeriggio, festivo, notturno...).
// Una farmacia è "di turno oggi" se ha almeno una fascia tipo "turno"
// che INIZIA oggi (data di orari_N_da == oggi) — la finestra è
// autosufficiente per ciascun giorno: un turno notturno che finisce
// domani mattina compare comunque nel record di "oggi" con orari_N_da
// che parte esattamente da oggi 00:00, non serve incrociare col giorno
// prima. I valori *_da/*_a sono trattati come stringa (confronto sui
// primi 10 caratteri "YYYY-MM-DD"), senza passare da new Date(): non è
// documentato se il dataset esprime l'ora in UTC o già in orario locale
// italiano, e gli orari osservati (es. turno serale-notturno 20:00–08:30
// del giorno dopo) sono coerenti solo con un'interpretazione "ora
// locale già inclusa nella stringa" — usare Date rischierebbe di
// applicare un fuso sbagliato due volte.
//
// "Oggi" va comunque calcolato in fuso orario Europe/Rome (questo
// script gira su GitHub Actions in UTC) per sapere QUALE giorno stiamo
// cercando nel dataset — stessa cautela già documentata per
// formattaOrarioRichiesta() in app/api/treni/[tipo]/[stazione]/route.ts.
//
// Provincia ricavata dal campo idcomune (codice ISTAT del comune, senza
// zero iniziale, es. "30049" Udine, "93033" Pordenone) — prefisso a 2
// cifre della provincia ISTAT: 30 Udine, 31 Gorizia, 32 Trieste, 93
// Pordenone. Stesso schema di provinciaDaIdBalneazione ma formato
// diverso (qui il codice non ha il prefisso "IT006").
//
// Estensione 26/08/2026: la snapshot ora contiene TUTTE le farmacie
// (non solo quelle di turno oggi), ciascuna con TUTTE le proprie fasce
// di oggi (`orariOggi`, normali E turno, non solo turno) — richiesto
// dall'utente per una pagina "Tutte le farmacie" (`/farmacie-tutte`)
// accanto a quella già esistente "Farmacie di turno" (`/farmacie-di-
// turno`), sullo stesso modello hub+pagine di Sport e Strutture
// ricettive. Un'unica ingestione, un'unica snapshot Supabase — le due
// pagine filtrano client-side lo stesso dato (`diTurnoOggi()` in
// `lib/farmacie.ts`), nessun bisogno di due fetch separati.
// ---------------------------------------------------------------------

const FARMACIE_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/jbxd-m6xe.json";

const PROVINCIA_DA_PREFISSO_ISTAT_COMUNE = { "30": "udine", "31": "gorizia", "32": "trieste", "93": "pordenone" };

function provinciaDaIdComuneFarmacia(idcomune) {
  // BUG corretto il 26/08/2026: un `.padStart(6, "0")` qui prima dello
  // slice prependeva uno zero spurio — verificato con dati reali
  // (`$select=idcomune&$group=idcomune`) che idcomune è SEMPRE lungo
  // esattamente 5 caratteri (es. "32006" Trieste, "30129" Udine, "31007"
  // Gorizia, "93033" Pordenone), mai 6. Il padStart trasformava "30129"
  // in "030129" e lo slice(0,2) prendeva "03" invece di "30" — nessuna
  // provincia veniva MAI riconosciuta, ogni riga del dataset scartata
  // silenziosamente (`if (!provincia...) continue`), zero farmacie in
  // ogni pagina. Bug latente fin dall'implementazione originale (mai
  // stato notato prima perché il modulo non era ancora stato verificato
  // in produzione) — trovato dall'utente che segnalava pagine vuote.
  const s = String(idcomune ?? "");
  return PROVINCIA_DA_PREFISSO_ISTAT_COMUNE[s.slice(0, 2)] ?? null;
}

// en-CA produce direttamente "YYYY-MM-DD", comodo per il confronto per
// prefisso con i valori orari_N_da del dataset.
function oggiEuropeRome() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

async function ingestFarmacie() {
  const url = `${FARMACIE_DATASET_URL}?$limit=1000`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Dataset farmacie non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset farmacie vuoto");
    return;
  }

  const oggi = oggiEuropeRome();
  const perProvincia = {};

  for (const r of rows) {
    const provincia = provinciaDaIdComuneFarmacia(r.idcomune);
    const nome = testo(r.insegna) ?? testo(r.ragionesociale);
    if (!provincia || !nome) continue; // comune fuori regione, o riga senza nome — non dovrebbe capitare

    // Fino a 17 fasce orarie per farmacia (orari_0_* … orari_16_*): tutte
    // quelle che iniziano oggi, normali E turno (non solo turno — vedi
    // nota sopra, serve anche alla pagina "Tutte le farmacie").
    const orariOggi = [];
    for (let i = 0; i <= 16; i++) {
      const tipo = r[`orari_${i}_tipo`];
      const da = r[`orari_${i}_da`];
      if ((tipo === "normale" || tipo === "turno") && typeof da === "string" && da.slice(0, 10) === oggi) {
        orariOggi.push({ da, a: r[`orari_${i}_a`] ?? null, tipo });
      }
    }
    orariOggi.sort((a, b) => a.da.localeCompare(b.da));

    if (!perProvincia[provincia]) perProvincia[provincia] = { totale: 0, farmacie: [] };
    const p = perProvincia[provincia];
    p.totale++;
    p.farmacie.push({
      nome,
      comune: testo(r.comune),
      indirizzo: testo(r.indirizzo),
      telefono: testo(r.telefono),
      lat: r.latitudine ? Number(r.latitudine) : null,
      lon: r.longitudine ? Number(r.longitudine) : null,
      orariOggi,
    });
  }

  for (const p of Object.values(perProvincia)) {
    p.farmacie.sort(
      (a, b) => (a.comune ?? "").localeCompare(b.comune ?? "", "it") || a.nome.localeCompare(b.nome, "it")
    );
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn(`Nessuna farmacia trovata per oggi (${oggi})`);
  }

  await upsertSnapshot("farmacie", "farmacie", null, { data: oggi, per_provincia: perProvincia });
  const totaleFarmacie = Object.values(perProvincia).reduce((n, p) => n + p.totale, 0);
  console.log(`Farmacie aggiornate (${oggi}): ${totaleFarmacie} farmacie totali`);
}

// ---------------------------------------------------------------------
// STRUTTURE RICETTIVE — 8 registri regionali distinti (Bed & Breakfast,
// Affittacamere, Campeggi/Villaggi Turistici, Alloggi Agrituristici,
// Alberghi Diffusi, Strutture Ricettive a carattere Sociale, Dry
// Marina/Marina Resort, Rifugi Alpini Escursionistici), tutti dataset
// Socrata separati su dati.friuliveneziagiulia.it con lo STESSO schema
// minimale: provincia, comune, denominazione, email (opzionale), sito
// (opzionale, oggetto `{ url }`). NESSUN indirizzo, telefono o
// coordinata pubblicati dalla fonte — limite del dato stesso (verificato
// sulla metadata di 2 degli 8 dataset), non un'omissione nostra: niente
// mappa possibile con questi dati, solo elenco.
//
// Registri "certificati dai Comuni e dalla Direzione centrale attività
// produttive", aggiornati raramente (metadata di 2 degli 8 dataset
// verificata: entrambi fermi a settembre 2024 al momento di questa
// ingestione, 26/08/2026) — nella sostanza un dato quasi-statico, ma con
// una vera API Socrata dietro (a differenza di Aviazione, che ha
// richiesto raccolta manuale via WebFetch pagina per pagina): usiamo
// comunque il pattern di ingestione standard invece del file statico
// `lib/xxx.ts` una tantum — nessuno sforzo in più, e si aggiorna da solo
// se la Regione pubblica nuove voci, invece di restare fermo alla
// sessione in cui è stato raccolto.
//
// Un'unica funzione ingerisce tutti e 8 i tipi in parallelo e scrive
// un'UNICA snapshot Supabase ("strutture-ricettive") con tutti i tipi
// dentro (`{ aggiornato_al, tipi: { bb: {...}, affittacamere: {...},
// ... } }`) invece di 8 snapshot separate — un solo job, una sola riga
// di storico per esecuzione, ogni pagina di tipo legge la propria
// chiave dalla stessa snapshot condivisa.
// ---------------------------------------------------------------------

const DATASET_STRUTTURE_RICETTIVE = {
  bb: "jzsu-f86x",
  affittacamere: "6var-2hht",
  campeggi: "c2n8-qhph",
  agriturismi: "yg8e-47jy",
  "alberghi-diffusi": "69j3-9hcp",
  sociali: "csiv-njht",
  marina: "6xk5-2p3e",
  rifugi: "qnwt-cjvq",
};

// -----------------------------------------------------------------------
// Arricchimento contatti (indirizzo/telefono/sito/coordinate) — 26/08/2026
//
// I registri Socrata sopra non hanno indirizzo/telefono/coordinate (solo
// provincia/comune/denominazione/email/sito, verificato riga per riga).
// Su richiesta dell'utente, arricchiamo con OpenStreetMap (dati aperti,
// licenza ODbL) tramite abbinamento nome+comune — nessun ID condiviso
// con i dataset regionali, quindi il match è per forza euristico, non
// certo. `data/osm-strutture-ricettive.json` è un estratto statico,
// preparato UNA TANTUM in questa sessione da un export Overpass caricato
// dall'utente (1418 elementi OSM in FVG con tag tourism=hotel/apartment/
// guest_house/hostel/camp_site/alpine_hut/wilderness_hut/chalet/motel o
// leisure=marina, filtrato ai ~843 con almeno indirizzo/telefono/sito/
// email) — NON viene riscaricato ad ogni esecuzione (OSM non ha un'API
// raggiungibile da qui, vedi nota architettura in claude/fvgmonitor-
// stato.md): se l'utente vorrà dati OSM più freschi in futuro, andrà
// ripetuta la stessa procedura (query Overpass Turbo → nuovo export →
// sostituire questo file).
//
// Il campo `tipoOsm` del match NON viene usato per filtrare — un B&B e
// un affittacamere sono indistinguibili su OSM (nessun tag dedicato per
// molti dei nostri 8 tipi), quindi si accetta un match di qualunque tipo
// OSM purché nome+comune combacino abbastanza.
// -----------------------------------------------------------------------

const OSM_STRUTTURE_RICETTIVE = JSON.parse(
  readFileSync(path.join(__dirname, "data", "osm-strutture-ricettive.json"), "utf8")
);

// Parole troppo generiche per contare come "prova" di corrispondenza tra
// due nomi (es. "Casa Rossa" vs "Casa Bianca" non devono combaciare solo
// perché condividono "Casa") — rimosse da entrambi i lati prima del
// confronto. Include le forme tipiche della sintassi Socrata "NOME di
// COGNOME NOME" (il "di" del titolare, non il "di" del nome del posto).
const PAROLE_GENERICHE_NOME = new Set([
  "DI", "DA", "DEL", "DELLA", "DEI", "DELLE", "DEGLI", "IN", "E", "ED", "&",
  "B", "BB", "BED", "BREAKFAST", "HOTEL", "ALBERGO", "CASA", "VILLA",
  "AZIENDA", "AGRICOLA", "AGRITURISMO", "FATTORIA", "RIFUGIO", "CAMPING",
  "CAMPEGGIO", "MARINA", "RESORT", "HOUSE", "HOME", "SOCIETA", "SRL", "SAS",
  "SNC", "DIFFUSO", "ALBERGHI",
]);

function normalizzaTesto(s) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// `extraStopwords` porta anche le parole del COMUNE (es. "TRIESTE",
// "LIGNANO", "SABBIADORO") — trovato con dati reali: quasi ogni nome che
// contiene il nome del comune ("Trieste Plus", "Bora di Trieste", "BB
// Trieste"...) veniva abbinato a "B&B Hotel Trieste" su OSM, il cui unico
// token dopo aver tolto le parole generiche restava "TRIESTE" — lungo
// abbastanza da superare la soglia di 6 caratteri, ma senza alcun valore
// distintivo perché è solo il nome della città, non del locale.
function tokenSignificativi(nome, extraStopwords) {
  return normalizzaTesto(nome)
    .split(" ")
    .filter((t) => t && !PAROLE_GENERICHE_NOME.has(t) && !extraStopwords?.has(t));
}

// true se il nome (probabilmente più corto/pulito) di OSM è "contenuto"
// nel nome Socrata (spesso più lungo, con titolare incluso) — richiede
// che TUTTI i token significativi del lato più corto compaiano nell'altro,
// e almeno un token significativo da confrontare (altrimenti "Villa" da
// solo, dopo la rimozione delle parole generiche, matcherebbe con tutto).
function nomiCorrispondono(nomeSocrata, nomeOsm, comuneStopwords) {
  const tA = tokenSignificativi(nomeSocrata, comuneStopwords);
  const tB = tokenSignificativi(nomeOsm, comuneStopwords);
  if (tA.length === 0 || tB.length === 0) return false;
  const [corti, lunghi] = tA.length <= tB.length ? [tA, tB] : [tB, tA];
  const insiemeLunghi = new Set(lunghi);
  if (!corti.every((t) => insiemeLunghi.has(t))) return false;
  // Un solo token in comune è una prova debole se quel token è corto —
  // trovato con dati reali: "PINO MARE" (Lignano) veniva abbinato a un
  // "Hotel Mare" non correlato solo perché condividevano "MARE" (4
  // lettere) dopo aver tolto "HOTEL" dalle parole generiche. Con un solo
  // token di prova, richiediamo che sia abbastanza lungo da essere
  // distintivo (soglia scelta empiricamente, non una scienza esatta).
  if (corti.length === 1 && corti[0].length < 6) return false;
  return true;
}

// Indice per comune normalizzato, costruito una sola volta (non ad ogni
// riga) — l'elenco OSM è piccolo (843 voci) ma questo evita di rifare la
// normalizzazione ad ogni confronto.
const INDICE_OSM_PER_COMUNE = (() => {
  const indice = new Map();
  for (const voce of OSM_STRUTTURE_RICETTIVE) {
    if (!voce.comune) continue;
    const chiave = normalizzaTesto(voce.comune);
    if (!indice.has(chiave)) indice.set(chiave, []);
    indice.get(chiave).push(voce);
  }
  return indice;
})();

function trovaArricchimentoOsm(nome, comune) {
  const candidati = INDICE_OSM_PER_COMUNE.get(normalizzaTesto(comune));
  if (!candidati) return null;
  const comuneStopwords = new Set(normalizzaTesto(comune).split(" ").filter(Boolean));
  const match = candidati.find((c) => nomiCorrispondono(nome, c.nome, comuneStopwords));
  if (!match) return null;
  const contatti = { fonte: "osm" };
  if (match.indirizzo) contatti.indirizzo = match.cap ? `${match.indirizzo}, ${match.cap}` : match.indirizzo;
  if (match.telefono) contatti.telefono = match.telefono;
  if (match.email) contatti.email = match.email;
  if (match.sito) contatti.sito = match.sito;
  if (match.lat != null && match.lon != null) {
    contatti.lat = match.lat;
    contatti.lon = match.lon;
  }
  return contatti;
}

// I 4 valori osservati per il campo "provincia" sono già il nome per
// esteso in maiuscolo (non un codice ISTAT come altrove) — basta il
// lowercase per combaciare con ProvinciaSlug, verificato con una query
// $select=distinct provincia su uno degli 8 dataset.
const PROVINCE_STRUTTURE_RICETTIVE = { UDINE: "udine", GORIZIA: "gorizia", TRIESTE: "trieste", PORDENONE: "pordenone" };

// -----------------------------------------------------------------------
// Arricchimento contatti — turismofvg.it (26/08/2026)
//
// Fonte più ricca di OSM (indirizzo, telefono, email, sito, titolare, CIN
// quando presente) e aggiornata dagli operatori stessi, non un estratto
// di terzi — quando disponibile ha PRECEDENZA sul match OSM (vedi
// `trovaContattiArricchiti` più sotto e il commento su `fonte` nel tipo
// `ContattiArricchiti` in lib/struttureRicettive.ts).
//
// Struttura del sito, verificata su HTML reale fornito dall'utente (una
// pagina elenco e una scheda di dettaglio, non solo via WebFetch che
// restituisce markdown e non l'HTML grezzo servito ai selettori cheerio):
//   - Ogni categoria ha una pagina elenco "/{Categoria}/Search" che
//     supporta paginazione semplice (?filters.PageIndex=N, GET
//     server-rendered, NESSUN endpoint AJAX/JSON come ipotizzato in una
//     fase di ricerca precedente — corretto grazie ai dati reali).
//   - La stessa pagina elenco (già alla pagina 1, qualunque PageIndex)
//     contiene un campo nascosto <input id="mapdata" value="[...]">
//     con l'INTERO indice della categoria in JSON (Id, Name, Url, Type,
//     City, Latitude, Longitude) — un solo fetch invece di scorrere
//     tutte le pagine, valido per qualunque categoria.
//   - La scheda di dettaglio ha i dati di contatto in una sezione
//     <section class="c-poi__auxtexts"> con coppie ripetute
//     <strong>Etichetta</strong><br>Valore<br><br> (Valore a volte è un
//     link, es. la Pec come mailto:) — vedi `estraiCampiAuxTexts`.
//
// SOLO Agriturismi è verificato sulla struttura HTML reale per ora — le
// altre 7 categorie del sito potrebbero avere URL o etichette diverse
// (es. "Telefono" invece di "Cellulare", un campo "Sito web"/"CIN" non
// presenti sulla scheda campione). Il parser sotto è generico (legge
// qualunque etichetta trovi, non un elenco fisso), quindi dovrebbe
// reggere variazioni ragionevoli, ma l'espansione alle altre categorie
// va comunque validata con un altro campione reale prima di aggiungerle
// a TURISMOFVG_CATEGORIE — vedi "Idee future" in claude/fvgmonitor-stato.md.
//
// Volume di richieste: 1 fetch per l'indice (sempre, è economico ed è
// l'unico modo di sapere quali schede sono nuove) + al massimo
// TURISMOFVG_MAX_NUOVE_SCHEDE_PER_ESECUZIONE schede di dettaglio nuove
// per esecuzione, con cache permanente (una scheda già scaricata non
// cambia spesso, non viene mai ripetuta) — stesso pattern già collaudato
// per i risultati gara Sci più sotto in questo file.
// -----------------------------------------------------------------------

const TURISMOFVG_MAX_NUOVE_SCHEDE_PER_ESECUZIONE = 20;

const TURISMOFVG_CATEGORIE = {
  agriturismi: "Agriturismi",
};

// Spezza il contenuto HTML di <section class="c-poi__auxtexts"> sulle
// coppie di <br> consecutivi (il separatore osservato tra un campo e il
// successivo) e, per ciascun blocco, legge l'etichetta dal primo
// <strong> e il valore dal testo restante — oppure dal testo di un
// eventuale link (es. la Pec, che sulla pagina è un <a href="mailto:...">).
// Generico apposta: non presuppone un elenco fisso di etichette, quindi
// regge campi come "Sito web" o "CIN" anche se non osservati sul
// campione usato per scrivere questa funzione.
function estraiCampiAuxTexts($aux) {
  const html = $aux.html() || "";
  const blocchi = html
    .replace(/<br\s*\/?>/gi, "<br>")
    .split(/<br><br>/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const campi = {};
  for (const blocco of blocchi) {
    const $b = cheerio.load(`<div id="campo">${blocco}</div>`);
    const label = $b("strong").first().text().trim();
    if (!label) continue;

    const link = $b("a").first();
    let valore = null;
    if (link.length) {
      const href = link.attr("href") || "";
      valore = href.toLowerCase().startsWith("mailto:") ? href.slice(7).trim() : link.text().trim();
    } else {
      $b("strong").remove();
      valore = $b("#campo").text().trim();
    }
    if (valore) campi[label] = valore;
  }
  return campi;
}

async function fetchIndiceTurismoFvg(segmentoCategoria) {
  const res = await fetchConRetry(`https://www.turismofvg.it/${segmentoCategoria}/Search`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Indice turismofvg.it/${segmentoCategoria} HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const raw = $("#mapdata").attr("value");
  if (!raw) throw new Error(`turismofvg.it/${segmentoCategoria}: campo #mapdata non trovato — struttura pagina cambiata?`);

  let voci;
  try {
    voci = JSON.parse(raw);
  } catch {
    throw new Error(`turismofvg.it/${segmentoCategoria}: JSON in #mapdata non valido`);
  }
  if (!Array.isArray(voci)) throw new Error(`turismofvg.it/${segmentoCategoria}: formato #mapdata inatteso`);

  return voci
    .map((v) => ({
      id: v.Id != null ? String(v.Id) : null,
      nome: testo(v.Name),
      url: typeof v.Url === "string" ? v.Url : null,
      comune: testo(v.City),
      lat: typeof v.Latitude === "number" ? v.Latitude : null,
      lon: typeof v.Longitude === "number" ? v.Longitude : null,
    }))
    .filter((v) => v.id && v.nome && v.url);
}

async function fetchDettaglioTurismoFvg(urlAssoluto) {
  const res = await fetchConRetry(urlAssoluto, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Scheda ${urlAssoluto} HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const $aux = $(".c-poi__auxtexts").first();
  const campi = $aux.length ? estraiCampiAuxTexts($aux) : {};

  const telefono = campi["Telefono"] || campi["Cellulare"] || null;
  const email = campi["Email"] || campi["E-mail"] || campi["Pec"] || null;
  const sito = campi["Sito web"] || campi["Sito"] || campi["Web"] || null;
  const indirizzo = campi["Indirizzo"] || null;
  const cap = campi["CAP"] || null;
  const titolare = campi["Titolare"] || null;
  const cin = campi["CIN"] || null;

  // Coordinate di riserva dal link "Indicazioni" verso Google Maps —
  // indipendenti dall'indice mapdata, utile come controincrocio o
  // fallback se in futuro una scheda avesse coordinate diverse.
  let lat = null;
  let lon = null;
  const hrefMappa = $(".c-poi_map").first().attr("href") || "";
  const mMappa = /loc:(-?\d+\.?\d*),(-?\d+\.?\d*)/.exec(hrefMappa);
  if (mMappa) {
    lat = Number(mMappa[1]);
    lon = Number(mMappa[2]);
  }

  return {
    telefono,
    email,
    sito,
    indirizzo: indirizzo ? (cap ? `${indirizzo}, ${cap}` : indirizzo) : null,
    titolare,
    cin,
    lat,
    lon,
  };
}

async function ingestTurismoFvgCategoria(tipoSlug, segmentoCategoria) {
  const idSnapshot = `turismofvg:${tipoSlug}`;

  let indice;
  try {
    indice = await fetchIndiceTurismoFvg(segmentoCategoria);
  } catch (err) {
    console.warn(`TurismoFVG ${tipoSlug}: indice non scaricato, riuso la cache se presente — ${err.message}`);
    return await leggiSnapshotEsistente(idSnapshot);
  }

  const cacheEsistente = await leggiSnapshotEsistente(idSnapshot);
  const dettagliCache = { ...(cacheEsistente?.dettagli || {}) };

  let nuoveScaricate = 0;
  let rimandate = 0;
  for (const voce of indice) {
    if (dettagliCache[voce.id]) continue; // già in cache, mai ri-scaricata

    if (nuoveScaricate >= TURISMOFVG_MAX_NUOVE_SCHEDE_PER_ESECUZIONE) {
      rimandate++;
      continue; // ripresa alla prossima esecuzione
    }

    try {
      const urlAssoluto = voce.url.startsWith("http")
        ? voce.url
        : `https://www.turismofvg.it${voce.url.startsWith("/") ? "" : "/"}${voce.url}`;
      const dettaglio = await fetchDettaglioTurismoFvg(urlAssoluto);
      dettagliCache[voce.id] = { ...dettaglio, aggiornato_al: new Date().toISOString() };
      nuoveScaricate++;
    } catch (err) {
      console.warn(`TurismoFVG ${tipoSlug}: scheda ${voce.id} (${voce.nome}) non scaricata — ${err.message}`);
      // non salvata in cache: ritentata automaticamente alla prossima esecuzione
    }
  }

  if (rimandate > 0) {
    console.log(`TurismoFVG ${tipoSlug}: ${rimandate} schede rimandate alla prossima esecuzione (limite ${TURISMOFVG_MAX_NUOVE_SCHEDE_PER_ESECUZIONE}/esecuzione)`);
  }

  const risultato = { indice, dettagli: dettagliCache, aggiornato_al: new Date().toISOString() };

  // Come per lo sci: nessuna scrittura (né riga di storico) se non è
  // cambiato nulla di rilevante — qui approssimato con "nessuna scheda
  // nuova e la dimensione dell'indice non è cambiata", sufficiente a
  // evitare righe identiche ogni 15 minuti senza la complessità di un
  // confronto profondo.
  if (nuoveScaricate === 0 && cacheEsistente && cacheEsistente.indice?.length === indice.length) {
    console.log(`TurismoFVG ${tipoSlug}: nessuna novità, snapshot non riscritto`);
    return cacheEsistente;
  }

  try {
    await upsertSnapshot(idSnapshot, "turismofvg", null, risultato);
  } catch (err) {
    console.warn(`TurismoFVG ${tipoSlug}: snapshot non salvato — ${err.message}`);
  }

  console.log(
    `TurismoFVG ${tipoSlug} aggiornato: ${indice.length} in indice, ${Object.keys(dettagliCache).length} schede con dettaglio (${nuoveScaricate} nuove questa esecuzione)`
  );
  return risultato;
}

async function ingestTurismoFvg() {
  const risultati = {};
  for (const [tipoSlug, segmento] of Object.entries(TURISMOFVG_CATEGORIE)) {
    try {
      risultati[tipoSlug] = await ingestTurismoFvgCategoria(tipoSlug, segmento);
    } catch (err) {
      console.warn(`TurismoFVG ${tipoSlug}: ingestione fallita — ${err.message}`);
    }
  }
  return risultati;
}

// Indice per comune normalizzato dei dati turismofvg.it di UNA categoria
// (costruito ad ogni esecuzione, i dati vengono dalla rete non da un
// file statico) — solo le voci con scheda di dettaglio già in cache
// (`dettagli[id]`) entrano nell'indice: una voce presente solo
// nell'indice mapdata ma non ancora scaricata (limite per esecuzione)
// non ha ancora contatti da offrire, verrà ripresa da sola quando pronta.
function costruisceIndiceTurismoFvgPerComune(datiCategoria) {
  const indice = new Map();
  if (!datiCategoria) return indice;
  for (const voce of datiCategoria.indice) {
    const dettaglio = datiCategoria.dettagli[voce.id];
    if (!voce.comune || !dettaglio) continue;
    const chiave = normalizzaTesto(voce.comune);
    if (!indice.has(chiave)) indice.set(chiave, []);
    indice.get(chiave).push({ nome: voce.nome, dettaglio, lat: voce.lat, lon: voce.lon });
  }
  return indice;
}

function trovaArricchimentoTurismoFvg(nome, comune, indicePerComune) {
  const candidati = indicePerComune.get(normalizzaTesto(comune));
  if (!candidati) return null;
  const comuneStopwords = new Set(normalizzaTesto(comune).split(" ").filter(Boolean));
  const match = candidati.find((c) => nomiCorrispondono(nome, c.nome, comuneStopwords));
  if (!match) return null;

  const d = match.dettaglio;
  const contatti = { fonte: "turismofvg" };
  if (d.indirizzo) contatti.indirizzo = d.indirizzo;
  if (d.telefono) contatti.telefono = d.telefono;
  if (d.email) contatti.email = d.email;
  if (d.sito) contatti.sito = d.sito;
  if (d.titolare) contatti.titolare = d.titolare;
  if (d.cin) contatti.cin = d.cin;
  const lat = d.lat ?? match.lat;
  const lon = d.lon ?? match.lon;
  if (lat != null && lon != null) {
    contatti.lat = lat;
    contatti.lon = lon;
  }
  return contatti;
}

// Prova prima turismofvg.it (più ricco, quando disponibile per questa
// categoria e questa voce), poi ripiega su OSM — mai i due combinati,
// per non mischiare in un'unica voce dati di provenienza diversa senza
// modo di distinguerli in UI.
function trovaContattiArricchiti(nome, comune, indiceTurismoFvgPerComune) {
  if (indiceTurismoFvgPerComune) {
    const daTurismoFvg = trovaArricchimentoTurismoFvg(nome, comune, indiceTurismoFvgPerComune);
    if (daTurismoFvg) return daTurismoFvg;
  }
  return trovaArricchimentoOsm(nome, comune);
}

async function ingestTipoStrutturaRicettiva(datasetId, indiceTurismoFvgPerComune) {
  const url = `https://www.dati.friuliveneziagiulia.it/resource/${datasetId}.json?$limit=5000`;
  const res = await fetchConRetry(url);
  if (!res.ok) throw new Error(`Dataset ${datasetId} non disponibile (HTTP ${res.status})`);

  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`Dataset ${datasetId}: risposta inattesa`);

  const perProvincia = {};
  for (const r of rows) {
    const provincia = PROVINCE_STRUTTURE_RICETTIVE[(r.provincia ?? "").toUpperCase()];
    if (!provincia || !r.denominazione) continue; // comune fuori regione o riga senza nome — non dovrebbe capitare
    if (!perProvincia[provincia]) perProvincia[provincia] = [];
    const nome = testo(r.denominazione);
    const comune = testo(r.comune);
    perProvincia[provincia].push({
      nome,
      comune,
      email: testo(r.email),
      sito: r.sito?.url ?? null,
      // Arricchimento best-effort — turismofvg.it quando disponibile per
      // questo tipo, altrimenti OpenStreetMap (vedi note sopra). Sempre
      // null se non troviamo un abbinamento nome+comune sufficientemente
      // sicuro, mai un dato inventato o approssimato.
      contatti: trovaContattiArricchiti(nome, comune, indiceTurismoFvgPerComune),
    });
  }
  for (const lista of Object.values(perProvincia)) {
    lista.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }

  const totale = Object.values(perProvincia).reduce((n, l) => n + l.length, 0);
  return { totale, per_provincia: perProvincia };
}

async function ingestStruttureRicettive() {
  // turismofvg.it prima di OSM: i suoi indici per comune (uno per tipo
  // coperto, oggi solo "agriturismi" — vedi TURISMOFVG_CATEGORIE) devono
  // essere pronti prima di ingerire i dataset Socrata, che li usano per
  // l'arricchimento contatti.
  const risultatiTurismoFvg = await ingestTurismoFvg();
  const indiciTurismoFvgPerTipo = {};
  for (const [tipoSlug, dati] of Object.entries(risultatiTurismoFvg)) {
    indiciTurismoFvgPerTipo[tipoSlug] = costruisceIndiceTurismoFvgPerComune(dati);
  }

  const chiavi = Object.keys(DATASET_STRUTTURE_RICETTIVE);
  const risultati = await Promise.allSettled(
    chiavi.map((chiave) =>
      ingestTipoStrutturaRicettiva(DATASET_STRUTTURE_RICETTIVE[chiave], indiciTurismoFvgPerTipo[chiave] ?? null)
    )
  );

  const tipi = {};
  let falliti = 0;
  risultati.forEach((r, i) => {
    const chiave = chiavi[i];
    if (r.status === "fulfilled") {
      tipi[chiave] = r.value;
    } else {
      falliti++;
      console.warn(`Strutture ricettive — tipo "${chiave}" fallito:`, r.reason);
    }
  });

  if (Object.keys(tipi).length === 0) {
    console.warn("Strutture ricettive: nessun tipo ingerito con successo, snapshot non aggiornata");
    return;
  }

  await upsertSnapshot("strutture-ricettive", "strutture-ricettive", null, {
    aggiornato_al: new Date().toISOString(),
    tipi,
  });
  const totale = Object.values(tipi).reduce((n, t) => n + t.totale, 0);
  console.log(
    `Strutture ricettive aggiornate: ${totale} strutture in ${Object.keys(tipi).length}/${chiavi.length} tipi` +
      (falliti > 0 ? ` (${falliti} tipi falliti)` : "")
  );
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
// POLLINI — rete aerobiologica POLLnet, dataset "Aria - Pollini" (id
// rnci-smsu) sullo stesso portale Socrata delle altre matrici aria.
// A differenza di PM10/PM2.5/Ozono/NO2, qui non c'è un solo valore
// per provincia ma decine di generi pollinici per stazione — teniamo
// solo i generi con presenza rilevata questa settimana (media > 0),
// i più alti per primi.
//
// Il dataset contiene insieme stazioni storiche dismesse e stazioni
// attive (stesso "sito", ma dati fermi ad anni diversi) — le
// associamo a provincia per nome e le consideriamo attive solo se
// compaiono nella settimana più recente (stesso "al" della riga più
// recente in assoluto). Verificato manualmente (agosto 2026): 4
// stazioni attive — Trieste (Castello di S. Giusto), Lignano
// Sabbiadoro e Tolmezzo (entrambe provincia di Udine), Pordenone.
// **Nessuna stazione attiva in provincia di Gorizia** (Monfalcone,
// l'unica storica lì, ferma al 2011) — gap noto e reale della rete
// regionale, non un bug: stesso trattamento "n.d." già usato altrove
// nel progetto (es. ozono a Pordenone, stazione dismessa dal 2013).
//
// Nessuna classificazione di rischio (assente/scarsa/media/alta):
// ARPA FVG la pubblica ma con soglie diverse per ciascun genere,
// documentate solo in una pagina che non è stato possibile estrarre
// in modo affidabile in formato tabellare — mostriamo il dato grezzo
// (media giornaliera della settimana, granuli/m³) rimandando al
// bollettino ufficiale per l'interpretazione clinica.
// ---------------------------------------------------------------------

const POLLINI_DATASET_URL = "https://www.dati.friuliveneziagiulia.it/resource/rnci-smsu.json";

const STAZIONI_POLLINI = [
  { match: "trieste 1", provincia: "trieste", nome: "Trieste — Castello di S. Giusto" },
  { match: "lignano", provincia: "udine", nome: "Lignano Sabbiadoro" },
  { match: "tolmezzo", provincia: "udine", nome: "Tolmezzo" },
  { match: "pordenone 1", provincia: "pordenone", nome: "Pordenone" },
];

async function ingestPollini() {
  const url = `${POLLINI_DATASET_URL}?$order=al DESC&$limit=1000`;
  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Dataset pollini non disponibile (HTTP ${res.status})`);
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("Dataset pollini vuoto");
    return;
  }

  const alPiuRecente = rows[0].al;
  const righeRecenti = rows.filter((r) => r.al === alPiuRecente);
  const dalSettimana = righeRecenti[0]?.dal ?? null;

  const perProvincia = {};
  for (const staz of STAZIONI_POLLINI) {
    const righeStazione = righeRecenti.filter((r) => r.sito?.toLowerCase().includes(staz.match));
    if (righeStazione.length === 0) continue; // stazione non presente questa settimana

    const pollini = righeStazione
      .map((r) => ({
        famiglia: r.famiglia ?? null,
        genere: r.genere ?? null,
        media: r.media !== undefined && r.media !== null ? Number(r.media) : null,
      }))
      .filter((p) => p.media !== null && p.media > 0 && p.genere)
      .sort((a, b) => b.media - a.media)
      .slice(0, 6)
      .map((p) => ({ ...p, media: Math.round(p.media * 10) / 10 }));

    if (!perProvincia[staz.provincia]) perProvincia[staz.provincia] = [];
    perProvincia[staz.provincia].push({ stazione: staz.nome, pollini });
  }

  if (Object.keys(perProvincia).length === 0) {
    console.warn("Nessuna stazione pollini attiva trovata nella settimana più recente");
    return;
  }

  await upsertSnapshot("pollini", "pollini", null, {
    dal: dalSettimana,
    al: alPiuRecente,
    per_provincia: perProvincia,
  });
  console.log(
    `Pollini aggiornati (${Object.keys(perProvincia).length} province, settimana fino al ${alPiuRecente})`
  );
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
// TENNIS — ranking FITP (Federazione Italiana Tennis e Padel), categoria
// "Assoluti" (open, senza limiti di età), maschile e femminile, FVG.
//
// API scoperta dall'utente via DevTools (la pagina ufficiale fitp.it è
// una SPA Angular che non espone dati nell'HTML statico — stesso
// ostacolo incontrato con il nuoto, ma qui risolto grazie a un
// endpoint JSON diretto).
//
//   POST https://dp-myfit-test-function-v2.azurewebsites.net/api/v1/tesserati/list
//   Content-Type: application/json
//   body: { id_disciplina, id_provincia, id_regione, id_gruppo_rank,
//           id_categoria_rank, id_categoria_eta, sesso, freetext,
//           rowstoskip, fetchrows, sortcolumn, sortorder }
//
// id_regione=6 → Friuli-Venezia Giulia, id_disciplina=4332 → Tennis
// (entrambi confermati sperimentalmente confrontando i conteggi).
//
// NOTE IMPORTANTI (verificate con richieste reali, non assunte):
//
// 1) sortcolumn NON è affidabile per ordinare per classifica. Testati
//    "gr", "grado", "classifica_ranking": nessuno produce un ordine
//    corretto (es. con "grado"/"classifica_ranking" il primo risultato
//    aveva gr="4.NC", una delle classifiche peggiori possibili — e i
//    due nomi colonna restituivano risultati IDENTICI, segno che
//    entrambi vengono ignorati lato server e si ricade su un ordine
//    di default arbitrario). Risolto ordinando lato client (nota 4).
//
// 2) sesso ("M"/"F") è invece un filtro affidabile e verificato:
//    M=2691 + F=757 = 3448, combacia col totale non filtrato.
//
// 3) Il parametro id_categoria_eta (presumibilmente il filtro
//    server-side per "categoria età", es. Assoluti/Over 40/Under 16)
//    non è stato scoperto — nessun valore noto per "Assoluti". Aggirato
//    filtrando lato client sul campo restituito "ce": si ipotizza (in
//    base a tutti gli esempi osservati, mai smentita) che
//    ce === "NOR" = Assoluti maschile, ce === "NOF" = Assoluti
//    femminile — non confermato da un'etichetta esplicita dell'API,
//    solo dedotto dai nomi e dal genere dei nominativi corrispondenti.
//    Se in futuro risultasse sbagliato, va rivisto qui.
//
// 4) Ordinamento classifica: il campo "gr" (grado/classifica) segue
//    sempre il formato "<cifra>.<cifra o NC>" (es. "2.4", "4.NC" — 1 è
//    la categoria migliore, 4 la più debole; NC = non classificato,
//    peggio di qualsiasi cifra). Un confronto alfabetico ascendente
//    sulla stringa "gr" produce da solo l'ordine corretto dal migliore
//    al peggiore, perché il carattere "N" ha valore ASCII maggiore di
//    qualsiasi cifra — nessun bisogno di interpretare la gerarchia
//    delle classifiche italiane. Verificato su tutti i valori "gr"
//    osservati nei campioni (tutti nel formato atteso). La cifra prima
//    del punto è anche la "categoria" (2ª/3ª/4ª) richiesta dall'utente
//    per suddividere le classifiche (vedi ingestGenereTennis sotto).
//
// 5) La prima versione di questo modulo (senza deduplicazione)
//    produceva classifiche con lo stesso giocatore ripetuto più volte
//    (stessi nome/cognome/comune/grado/V-P) — segnalato dall'utente con
//    uno screenshot in produzione. Il sandbox di questa sessione non
//    riesce a chiamare l'API per verificare direttamente la causa
//    esatta (l'host `dp-myfit-test-function-v2.azurewebsites.net` non è
//    nella allowlist di rete di questo ambiente — errore distinto da un
//    blocco lato FITP, non testabile da qui nemmeno con un fetch
//    diretto in Node). Cause plausibili non escluse a vicenda: (a)
//    l'API non rispetta `rowstoskip` in modo affidabile e restituisce
//    pagine sovrapposte; (b) con `id_gruppo_rank`/`id_categoria_rank`
//    lasciati a null l'API restituisce più righe per la stessa persona
//    (es. una per gruppo di ranking). **Soluzione adottata, robusta
//    indipendentemente dalla causa esatta**: deduplicare per
//    nome+cognome+comune dopo il filtro `ce`, PRIMA di ordinare — vedi
//    `dedupeGiocatoriTennis`. Rimossa anche la condizione di stop
//    `giocatori.length < fetchrows` nella paginazione (poteva fermarsi
//    troppo presto se l'API limita silenziosamente la dimensione di
//    pagina sotto quella richiesta), sostituita da un contatore di
//    sicurezza anti-loop-infinito.
//
// Per poter ordinare noi stessi serve l'elenco completo per categoria:
// si pagina l'intero elenco per sesso (filtro server affidabile) e si
// filtra per "ce" lato client, senza altri filtri server-side.
// ---------------------------------------------------------------------

const TENNIS_API_URL = "https://dp-myfit-test-function-v2.azurewebsites.net/api/v1/tesserati/list";
const TENNIS_ID_REGIONE_FVG = 6;
const TENNIS_ID_DISCIPLINA = 4332;
const TENNIS_PAGE_SIZE = 500;
const TENNIS_TOP_N = 10;
const TENNIS_MAX_PAGINE = 30; // sicurezza anti-loop-infinito, non un limite atteso in pratica

async function fetchPaginaTennis(sesso, rowstoskip) {
  const res = await fetchConRetry(TENNIS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)",
    },
    body: JSON.stringify({
      id_disciplina: TENNIS_ID_DISCIPLINA,
      id_provincia: 0,
      id_regione: TENNIS_ID_REGIONE_FVG,
      id_gruppo_rank: null,
      id_categoria_rank: null,
      id_categoria_eta: null,
      sesso,
      freetext: null,
      rowstoskip,
      fetchrows: TENNIS_PAGE_SIZE,
      sortcolumn: "cognome",
      sortorder: "asc",
    }),
  });
  if (!res.ok) throw new Error(`Tennis API HTTP ${res.status} (sesso=${sesso}, skip=${rowstoskip})`);
  return res.json();
}

// Pagina l'intero elenco per genere. Si ferma solo quando rowstoskip
// raggiunge il totale dichiarato dall'API (`record`) o quando una
// pagina torna vuota — MAI in base alla lunghezza della pagina rispetto
// a fetchrows (vedi nota 5 sopra: l'API potrebbe limitare la pagina
// sotto il valore richiesto senza avvisare).
async function fetchTuttiGiocatoriTennis(sesso) {
  const tutti = [];
  let rowstoskip = 0;
  let pagina = 0;
  for (;;) {
    pagina++;
    if (pagina > TENNIS_MAX_PAGINE) {
      console.warn(`Tennis (${sesso}): fermato dopo ${TENNIS_MAX_PAGINE} pagine — controllare se l'API rispetta rowstoskip`);
      break;
    }
    const { giocatori, record } = await fetchPaginaTennis(sesso, rowstoskip);
    if (!Array.isArray(giocatori) || giocatori.length === 0) break;
    tutti.push(...giocatori);
    rowstoskip += giocatori.length;
    if (rowstoskip >= record) break;
  }
  return tutti;
}

function mappaGiocatoreTennis(g) {
  return {
    nome: g.n,
    cognome: g.c,
    comune: g.cit,
    grado: g.gr,
    categoriaRanking: g.cr,
    partiteVinte: g.pv,
    partitePerse: g.pp,
  };
}

// Chiave usata per riconoscere lo stesso giocatore su più righe
// restituite dall'API (vedi nota 5 sopra) — non abbiamo un ID persona
// di cui fidarci ciecamente, nome+cognome+comune è il miglior
// compromesso disponibile con i campi che l'API espone.
function chiaveGiocatoreTennis(g) {
  return `${(g.c || "").trim().toLowerCase()}|${(g.n || "").trim().toLowerCase()}|${(g.cit || "").trim().toLowerCase()}`;
}

function dedupeGiocatoriTennis(lista) {
  const mappa = new Map();
  for (const g of lista) {
    const chiave = chiaveGiocatoreTennis(g);
    const esistente = mappa.get(chiave);
    // A parità di persona, se per assurdo i duplicati avessero un grado
    // diverso, teniamo quello migliore (stringa più bassa — vedi nota 4).
    if (!esistente || (g.gr && esistente.gr && g.gr < esistente.gr)) {
      mappa.set(chiave, g);
    }
  }
  return [...mappa.values()];
}

// Cifra prima del punto in "gr" = categoria (1 migliore .. 4 più debole,
// vedi nota 4 sopra) — sempre presente nel formato osservato.
function categoriaDiGrado(gr) {
  return gr ? gr.charAt(0) : null;
}

// Costruisce le classifiche 2ª/3ª/4ª categoria (richieste esplicitamente
// dall'utente, invece di un'unica lista "assoluta" dominata dai pochi
// giocatori di 1ª/2ª categoria) per un genere.
async function ingestGenereTennis(sesso, ceAtteso, prefissoSlug, prefissoNome) {
  const tutti = await fetchTuttiGiocatoriTennis(sesso);
  const filtrati = tutti.filter((g) => g.ce === ceAtteso && g.gr);
  const senzaDuplicati = dedupeGiocatoriTennis(filtrati);

  return ["2", "3", "4"].map((cifra) => {
    const delGruppo = senzaDuplicati
      .filter((g) => categoriaDiGrado(g.gr) === cifra)
      // Ordinamento lato client — vedi nota 4 sopra: confronto stringa
      // ascendente sul campo "gr" produce l'ordine dal migliore al peggiore.
      .sort((a, b) => (a.gr < b.gr ? -1 : a.gr > b.gr ? 1 : 0));
    return {
      slug: `${prefissoSlug}-${cifra}a-categoria`,
      nome: `${prefissoNome} — ${cifra}ª categoria`,
      giocatori: delGruppo.slice(0, TENNIS_TOP_N).map(mappaGiocatoreTennis),
      totale_categoria: delGruppo.length,
    };
  });
}

async function ingestTennis() {
  const [categorieM, categorieF] = await Promise.all([
    ingestGenereTennis("M", "NOR", "maschile", "Maschile"),
    ingestGenereTennis("F", "NOF", "femminile", "Femminile"),
  ]);

  const categorie = [...categorieM, ...categorieF];
  const totaleGiocatori = categorie.reduce((somma, c) => somma + c.giocatori.length, 0);
  if (totaleGiocatori === 0) {
    console.warn("Nessun giocatore tennis trovato nelle categorie 2ª/3ª/4ª — controllare l'ipotesi ce/NOR/NOF o il formato di gr");
    return;
  }

  await upsertSnapshot("tennis:classifica", "tennis", null, {
    categorie,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(
    `Tennis aggiornato: ${categorie.map((c) => `${c.nome} ${c.giocatori.length}/${c.totale_categoria}`).join(", ")}`
  );
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// SCI — calendario gare FISI (Federazione Italiana Sport Invernali),
// Comitato Friuli-Venezia Giulia. A differenza di Calcio/Basket/
// Baseball/Tennis, qui NON esiste una classifica di campionato: sono
// gare singole (fondo, salto, combinata nordica, biathlon, alpino,
// ecc.) — stesso tipo di modello dati discusso e mai implementato per
// il Nuoto (vedi "Idee future" nel doc di progetto), ma qui la fonte
// è stata effettivamente sbloccata.
//
// Endpoint scoperto dall'utente via DevTools → Network → "Copia come
// cURL" (stesso metodo del Tennis):
//
//   GET https://comitati.fisi.org/wp-admin/admin-ajax.php
//       ?action=competizioni_get_all
//       &offset=0&limit=10
//       &url=https://comitati.fisi.org/friuli-venezia-giulia/calendario/?d=
//       &idStagione=2026&dataInizio=01/06/2026&dataFine=30/05/2027
//
// Azione AJAX di WordPress (comitati.fisi.org gira su WordPress — solo
// le route REST standard sono documentate su /wp-json/, questa azione
// custom non compare lì). Risposta: array di gare, es.
//   { disciplina, dataInizio, comune, provincia, nazione, nome,
//     formato, livello, status, idCompetizione, logo_url }
//
// NOTE (dedotte da UNA sola risposta reale catturata il 25/08/2026,
// non da uno script di test sistematico come per calcio/tennis — vedi
// limiti sotto):
//
// 1) Il filtro geografico (FVG) non passa per un id numerico come nel
//    Tennis (`id_regione`) — passa per il parametro `url`, che deve
//    corrispondere alla pagina calendario del comitato regionale
//    (`FISI_CALENDARIO_URL` sotto). Non verificato cosa succeda con un
//    valore diverso — non necessario dato che l'unico valore che ci
//    serve è noto e funzionante.
//
// 2) `idStagione`/`dataInizio`/`dataFine`: la richiesta reale catturata
//    aveva idStagione=2026 abbinato a dataInizio=01/06/2026 e
//    dataFine=30/05/2027 — dedotto che la "stagione sciistica" è
//    etichettata con l'anno di inizio e va da giugno a maggio
//    dell'anno successivo (convenzione tipica dello sport invernale,
//    non documentata esplicitamente da FISI). Calcolata **dinamicamente**
//    a ogni esecuzione (`stagioneScisticaCorrente()`) invece di essere
//    scritta a mano come `COMPETIZIONI_CALCIO` (che richiede un
//    promemoria annuale manuale, vedi nota su calcio in README) — qui
//    non serve nessun intervento a ogni cambio stagione.
//
// 3) Solo 4 gare estive/autunnali trovate nel primo test (Sci di fondo,
//    Combinata Nordica, Salto con gli sci, Biathlon — a fine agosto la
//    stagione invernale vera e propria, dicembre-marzo, non è ancora
//    popolata nel calendario). Non un bug: il calendario gare si
//    riempie progressivamente nel corso della stagione man mano che le
//    società organizzatrici iscrivono le gare — atteso che la lista
//    cresca da qui a dicembre.
//
// 4) Solo lo status "In Calendario" è stato osservato nella risposta
//    dell'API — e (osservazione utente in produzione, 25/08/2026)
//    resta "In Calendario" ANCHE per gare con data ormai passata: il
//    campo non è affidabile per sapere se una gara si è svolta. Non
//    più usato per questo — vedi `svolta`/`stato` calcolati dalla
//    data in `mappaGaraSci` più sotto; il valore grezzo dell'API resta
//    solo in `statoApi`, come riferimento/debug.
//
// 5) Paginazione (`offset`/`limit`) non stata testata con più di una
//    pagina reale (il campione aveva solo 4 gare, meno del limit=10
//    richiesto). Per lo stesso motivo del bug duplicati sul Tennis
//    (vedi sopra), la paginazione qui NON si ferma in base alla
//    lunghezza della pagina rispetto a `limit` — si ferma solo su
//    pagina vuota, con deduplica per `idCompetizione` applicata in via
//    preventiva (lezione appresa dal Tennis, non aspettata un bug
//    analogo per confermarla).
//
// 6) Questa azione AJAX restituisce solo il calendario (data, luogo,
//    nome, livello) — non le classifiche di gara. I risultati delle
//    gare passate NON passano da questa API: sono pagine HTML statiche
//    separate, scaricate con cheerio — vedi la sezione più sotto
//    ("SCI — risultati delle gare passate").
// ---------------------------------------------------------------------

const FISI_AJAX_URL = "https://comitati.fisi.org/wp-admin/admin-ajax.php";
const FISI_CALENDARIO_URL = "https://comitati.fisi.org/friuli-venezia-giulia/calendario/?d=";
const FISI_PAGE_SIZE = 100;
const FISI_MAX_PAGINE = 30; // sicurezza anti-loop-infinito, non un limite atteso in pratica

// Stagione sciistica: giugno anno N → maggio anno N+1, etichettata come
// "anno N" — dedotto dalla richiesta reale (nota 2 sopra), non
// documentato esplicitamente da FISI. Calcolo dinamico per evitare la
// manutenzione manuale annuale che invece serve per COMPETIZIONI_CALCIO.
function stagioneScisticaCorrente(adesso = new Date()) {
  const anno = adesso.getFullYear();
  const mese = adesso.getMonth(); // 0 = gennaio … 5 = giugno
  return mese >= 5 ? anno : anno - 1;
}

function isoDaDataItaliana(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str || "");
  if (!m) return null;
  const [, giorno, mese, anno] = m;
  return `${anno}-${mese}-${giorno}`;
}

async function fetchPaginaSci(offset, dataInizio, dataFine, idStagione) {
  const params = new URLSearchParams({
    action: "competizioni_get_all",
    offset: String(offset),
    limit: String(FISI_PAGE_SIZE),
    url: FISI_CALENDARIO_URL,
    idStagione: String(idStagione),
    dataInizio,
    dataFine,
  });
  const res = await fetchConRetry(`${FISI_AJAX_URL}?${params.toString()}`, {
    headers: {
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`FISI API HTTP ${res.status} (offset=${offset})`);
  return res.json();
}

// Pagina l'intero calendario stagionale. Si ferma solo su pagina vuota
// (mai in base a `gare.length < FISI_PAGE_SIZE`) — vedi nota 5 sopra.
async function fetchTutteGareSci(dataInizio, dataFine, idStagione) {
  const tutte = [];
  let offset = 0;
  let pagina = 0;
  for (;;) {
    pagina++;
    if (pagina > FISI_MAX_PAGINE) {
      console.warn(`Sci: fermato dopo ${FISI_MAX_PAGINE} pagine — controllare la paginazione`);
      break;
    }
    const gare = await fetchPaginaSci(offset, dataInizio, dataFine, idStagione);
    if (!Array.isArray(gare) || gare.length === 0) break;
    tutte.push(...gare);
    offset += gare.length;
  }
  return tutte;
}

function dedupeGareSci(lista) {
  const mappa = new Map();
  for (const g of lista) {
    const chiave = g.idCompetizione ?? `${g.nome}|${g.dataInizio}|${g.comune}`;
    if (!mappa.has(chiave)) mappa.set(chiave, g);
  }
  return [...mappa.values()];
}

// NOTA (25/08/2026, osservazione utente in produzione): il campo
// `status` dell'API resta "In Calendario" ANCHE per competizioni con
// data ormai passata — non aggiornato lato FISI, non affidabile per
// sapere se una gara si è svolta. "svolta" viene quindi calcolato qui
// confrontando la data della gara con oggi, MAI leggendo `g.status`.
// Il valore grezzo dell'API è comunque tenuto in `statoApi` solo come
// riferimento/debug (non usato per alcuna logica, non mostrato di
// default nel frontend).
function mappaGaraSci(g, oggiIso) {
  const data = isoDaDataItaliana(g.dataInizio);
  const svolta = data ? data < oggiIso : false;
  return {
    id: g.idCompetizione ?? null,
    nome: g.nome ?? null,
    disciplina: g.disciplina ?? null,
    data,
    comune: g.comune ?? null,
    provincia: g.provincia ?? null,
    livello: g.livello ?? null,
    svolta,
    stato: svolta ? "Svolta" : "In programma",
    statoApi: g.status ?? null,
    formato: g.formato ?? null,
  };
}

async function ingestSci() {
  const stagione = stagioneScisticaCorrente();
  const dataInizio = `01/06/${stagione}`;
  const dataFine = `30/05/${stagione + 1}`;
  const oggiIso = new Date().toISOString().slice(0, 10);

  const grezze = await fetchTutteGareSci(dataInizio, dataFine, stagione);
  const senzaDuplicati = dedupeGareSci(grezze);
  const gare = senzaDuplicati
    .map((g) => mappaGaraSci(g, oggiIso))
    .filter((g) => g.data) // scarta eventuali gare con data in formato inatteso
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  if (gare.length === 0) {
    console.warn("Nessuna gara di sci trovata per la stagione corrente — controllare endpoint/parametri");
    return;
  }

  const discipline = [...new Set(gare.map((g) => g.disciplina).filter(Boolean))].sort();

  await upsertSnapshot("sci:calendario", "sci", null, {
    stagione: `${stagione}/${stagione + 1}`,
    discipline,
    gare,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Sci aggiornato: ${gare.length} gare, stagione ${stagione}/${stagione + 1}, discipline: ${discipline.join(", ")}`);

  // I risultati di gara sono un job "annesso" ma indipendente: se
  // fallisce (es. host bloccato, struttura pagina cambiata) il
  // calendario è già stato salvato correttamente sopra — non deve far
  // fallire l'intero job "sci" agli occhi di main().
  try {
    await ingestRisultatiSci(gare);
  } catch (err) {
    console.warn("Sci: risultati gare non aggiornati —", err.message);
  }
}

// ---------------------------------------------------------------------
// SCI — risultati delle gare passate (drill-down calendario →
// competizione → gara). Richiesto esplicitamente dall'utente il
// 25/08/2026, dopo aver verificato in produzione che il calendario
// funziona. Struttura HTML verificata manualmente su DUE pagine reali
// (outerHTML incollato dall'utente via DevTools, lo stesso host è
// bloccato dalla allowlist di rete di questo sandbox — vedi nota
// generale sopra sul Tennis/Sci):
//
//   - pagina "competizione" (?idComp=57797): elenco delle singole gare
//     che compongono l'evento (una per disciplina/specialità/
//     categoria/genere — 23 osservate per l'evento campione).
//   - pagina "gara" (?idGara=...&idComp=...): tabella risultati di UNA
//     gara (posizione, cod.fisi, atleta, anno, società, tempo gara,
//     punti gara, punti graduatoria).
//
// Entrambe le pagine riusano le STESSE classi CSS (`.disciplina`,
// `.luogo`, `.nome`, `.specialità`, `.status`) con significati
// completamente diversi tra una pagina e l'altra, e in più il nome
// classe `specialità` contiene un accento (rischioso come selettore
// letterale). Per questo l'estrazione qui sotto è SEMPRE posizionale
// (`.x-col` con indice fisso dentro `.x-row-inner`), mai per nome di
// classe — verificato con un mini script cheerio contro l'HTML reale
// prima di scrivere questo codice, non solo per ispezione visiva.
//
// NOTA sul volume di richieste: nessun endpoint "bulk" noto — una
// competizione con 20+ gare richiede 1 richiesta per l'elenco gare +
// 1 richiesta per gara per i risultati. In piena stagione invernale
// (dicembre-marzo) possono esserci decine di competizioni passate
// contemporaneamente nel calendario. Per non generare centinaia di
// richieste HTTP ad ogni esecuzione (ogni 15 minuti):
//   1) i risultati vengono messi in cache nello snapshot
//      `sci:risultati` — una competizione già scaricata per intero
//      (`completo: true`) non viene MAI ripetuta (i risultati di una
//      gara passata non cambiano più una volta pubblicati, per quanto
//      osservato finora — se in futuro risultasse falso, va rivista);
//   2) al massimo `FISI_MAX_COMPETIZIONI_NUOVE_PER_ESECUZIONE`
//      competizioni NUOVE vengono scaricate per esecuzione — le altre
//      restano in coda e vengono recuperate nelle esecuzioni
//      successive (arretrato smaltito in poche ore, accettabile per
//      dati storici non urgenti).
// ---------------------------------------------------------------------

const FISI_COMPETIZIONE_URL_BASE = "https://comitati.fisi.org/friuli-venezia-giulia/competizione/";
const FISI_GARA_URL_BASE = "https://comitati.fisi.org/friuli-venezia-giulia/gara/";
const FISI_MAX_GARE_PER_COMPETIZIONE = 60; // sicurezza anti-loop — ~20-25 osservate in pratica
const FISI_MAX_COMPETIZIONI_NUOVE_PER_ESECUZIONE = 5; // vedi nota sul volume di richieste sopra

// Pagina "competizione": elenco delle gare che compongono l'evento.
// Colonne osservate (indice `.x-col`, non nome classe — vedi nota
// generale sopra): 0 = disciplina (testo primario) + data/ora (sub),
// 1 = provincia (primario) + comune (sub), 2 = nome competizione
// (primario) + codice (sub), 3 = tipo gara (primario) + categoria/
// genere testuale (sub), 4 = stato (has-graphic, NON usato — vedi
// nota su `statoApi`), 5 = genere (lettera singola).
async function fetchGareCompetizioneSci(idComp) {
  const res = await fetchConRetry(`${FISI_COMPETIZIONE_URL_BASE}?idComp=${idComp}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Pagina competizione ${idComp} HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const righe = $("#competizioni-container").first().children("a");

  const gare = [];
  righe.each((i, el) => {
    if (i >= FISI_MAX_GARE_PER_COMPETIZIONE) return;
    const $el = $(el);
    const href = $el.attr("href") || "";
    const m = /idGara=(\d+)/.exec(href);
    if (!m) return; // riga senza idGara valido, struttura inattesa
    const idGara = m[1];

    const cols = $el.find(".x-row-inner").first().children(".x-col");
    if (cols.length < 6) return; // struttura inattesa, riga scartata

    const testoCol = (indice, selettore) => {
      const t = $(cols[indice]).find(selettore).first().text().trim();
      return t || null;
    };
    const primario = (indice) => testoCol(indice, ".x-text-content-text-primary");
    const secondario = (indice) => testoCol(indice, ".x-text-content-text-subheadline");

    gare.push({
      idGara,
      idCompetizione: String(idComp),
      disciplina: primario(0),
      dataOra: secondario(0),
      provincia: primario(1),
      comune: secondario(1),
      nomeCompetizione: primario(2),
      codice: secondario(2),
      tipoGara: primario(3),
      categoria: secondario(3),
      genere: primario(5),
    });
  });

  if (righe.length >= FISI_MAX_GARE_PER_COMPETIZIONE) {
    console.warn(`Competizione ${idComp}: raggiunto il limite di sicurezza di ${FISI_MAX_GARE_PER_COMPETIZIONE} gare — potrebbero mancarne alcune`);
  }

  return gare;
}

// Pagina "gara": tabella risultati di UNA gara. Colonne osservate
// (indice `.x-col`, stesse classi della pagina competizione ma con
// significato diverso — vedi nota generale sopra): 0 = posizione,
// 1 = cod.fisi, 2 = atleta, 3 = anno, 4 = società, 5 = tempo gara,
// 6 = punti gara (spesso il segnaposto letterale "-", trattato come
// nessun dato), 7 = punti graduatoria. Righe con cod.fisi/atleta/anno/
// società vuoti ma tempo/punti valorizzati sono normali (osservate
// nella pagina reale), non un errore di parsing.
async function fetchRisultatiGaraSci(idGara, idComp) {
  const res = await fetchConRetry(`${FISI_GARA_URL_BASE}?idGara=${idGara}&idComp=${idComp}&d=`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Pagina gara ${idGara} HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const righe = $("#competizioni-container").first().children("div");

  const risultati = [];
  righe.each((_, el) => {
    const $el = $(el);
    const cols = $el.find(".x-row-inner").first().children(".x-col");
    if (cols.length < 8) return; // struttura inattesa, riga scartata

    const primario = (indice) => {
      const t = $(cols[indice]).find(".x-text-content-text-primary").first().text().trim();
      return t || null;
    };

    const puntiGara = primario(6);
    risultati.push({
      posizione: primario(0),
      codFisi: primario(1),
      atleta: primario(2),
      anno: primario(3),
      societa: primario(4),
      tempoGara: primario(5),
      puntiGara: puntiGara === "-" ? null : puntiGara,
      puntiGraduatoria: primario(7),
    });
  });

  return risultati;
}

// Orchestrazione: per ogni competizione passata nel calendario non
// ancora in cache (fino al limite per esecuzione), scarica l'elenco
// gare e i risultati di ciascuna, poi salva tutto in `sci:risultati`.
async function ingestRisultatiSci(gareCalendario) {
  const competizioniPassate = gareCalendario.filter((g) => g.svolta && g.id);
  if (competizioniPassate.length === 0) {
    console.log("Sci risultati: nessuna competizione passata nel calendario, niente da scaricare");
    return;
  }

  const cacheEsistente = await leggiSnapshotEsistente("sci:risultati");
  const competizioniCache = { ...(cacheEsistente?.competizioni || {}) };

  let nuoveScaricate = 0;
  let rimandate = 0;

  for (const comp of competizioniPassate) {
    const esistente = competizioniCache[comp.id];
    if (esistente && esistente.completo) continue; // già in cache, zero richieste

    if (nuoveScaricate >= FISI_MAX_COMPETIZIONI_NUOVE_PER_ESECUZIONE) {
      rimandate++;
      continue; // ripresa alla prossima esecuzione
    }

    try {
      const gareConDettaglio = await fetchGareCompetizioneSci(comp.id);
      const gareConRisultati = [];
      for (const g of gareConDettaglio) {
        const risultati = await fetchRisultatiGaraSci(g.idGara, comp.id);
        gareConRisultati.push({ ...g, risultati });
      }
      competizioniCache[comp.id] = {
        completo: true,
        nomeCompetizione: comp.nome,
        data: comp.data,
        gare: gareConRisultati,
      };
      nuoveScaricate++;
    } catch (err) {
      console.warn(`Sci: risultati competizione ${comp.id} (${comp.nome}) non scaricati — ${err.message}`);
      // non salvato in cache: ritentato automaticamente alla prossima esecuzione
    }
  }

  if (rimandate > 0) {
    console.log(`Sci risultati: ${rimandate} competizioni rimandate alla prossima esecuzione (limite ${FISI_MAX_COMPETIZIONI_NUOVE_PER_ESECUZIONE}/esecuzione)`);
  }

  // Scrive solo se è cambiato qualcosa — altrimenti (cache già
  // completa, nessuna competizione nuova) ogni esecuzione da 15 minuti
  // aggiungerebbe una riga identica in `history` per mesi, inutilmente.
  if (nuoveScaricate === 0 && cacheEsistente) {
    console.log("Sci risultati: nessuna novità, snapshot non riscritto");
    return;
  }

  await upsertSnapshot("sci:risultati", "sci", null, {
    competizioni: competizioniCache,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Sci risultati aggiornato: ${Object.keys(competizioniCache).length} competizioni in cache (${nuoveScaricate} nuove questa esecuzione)`);
}

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

  // Tutti e 4 i prodotti sono nella stessa risposta — non serve una
  // chiamata separata per ciascuno
  const PRODOTTI_RADAR = {
    srtlbm_1: "SRTLBM_1", // intensità pioggia (mm)
    ssi: "SSI", // storm severity index
    hmc: "HMC", // classificazione idrometeore (pioggia/neve/grandine)
    lbm_v: "LBM_V", // velocità Doppler (m/s)
  };

  const risultato = {};
  for (const [chiave, nomeProdotto] of Object.entries(PRODOTTI_RADAR)) {
    const candidati = prodotti.filter((p) => p.name === nomeProdotto && p.format === "image/png");
    if (candidati.length === 0) continue;
    const piuRecente = candidati.sort((a, b) => new Date(b.dt) - new Date(a.dt))[0];

    // details.extent è [minLon, maxLat, maxLon, minLat] — i confini
    // geografici esatti dell'immagine, necessari per sovrapporla a una
    // vera mappa (l'immagine stessa è trasparente fuori dalle zone
    // colorate, senza base geografica non si capisce cosa si sta vedendo)
    risultato[chiave] = {
      immagine: `${PC_API_BASE}/products/${piuRecente.id}`,
      extent: piuRecente.details?.extent ?? null,
      aggiornato_al: piuRecente.dt,
    };
  }

  if (Object.keys(risultato).length === 0) {
    console.warn("Nessun prodotto radar trovato negli ultimi 30 minuti");
    return;
  }

  await upsertSnapshot("radar:fossalon", "radar", null, risultato);
  console.log(`Radar meteo aggiornato: ${Object.keys(risultato).join(", ")}`);
}

// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// TERREMOTI — INGV (Istituto Nazionale di Geofisica e Vulcanologia),
// servizio standard internazionale FDSN Event Web Service. L'API PC
// FVG ha uno schema dati "Earthquake" predisposto ma nessun endpoint
// GET pubblicato per interrogarlo — usiamo quindi la fonte ufficiale
// italiana per la sismologia, gratuita e senza chiave.
//
// Filtrato per area geografica FVG (bounding box), ultimi 30 giorni.
// ---------------------------------------------------------------------

const INGV_BBOX = { minLat: 45.3, maxLat: 46.9, minLon: 12.2, maxLon: 14.0 };

async function ingestTerremoti() {
  const ora = new Date();
  const trentaGiorniFa = new Date(ora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const url =
    `https://webservices.ingv.it/fdsnws/event/1/query?format=geojson` +
    `&starttime=${fmt(trentaGiorniFa)}&endtime=${fmt(ora)}` +
    `&minlatitude=${INGV_BBOX.minLat}&maxlatitude=${INGV_BBOX.maxLat}` +
    `&minlongitude=${INGV_BBOX.minLon}&maxlongitude=${INGV_BBOX.maxLon}&orderby=time`;

  const res = await fetchConRetry(url);
  if (!res.ok) {
    console.warn(`Terremoti INGV non disponibili (HTTP ${res.status})`);
    return;
  }

  const geojson = await res.json();
  const eventi = (geojson.features || []).map((f) => ({
    id: f.properties.eventId,
    data: f.properties.time,
    magnitudo: f.properties.mag,
    tipoMagnitudo: f.properties.magType,
    luogo: f.properties.place,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    profonditaKm: f.geometry.coordinates[2],
  }));

  await upsertSnapshot("terremoti:fvg", "terremoti", null, {
    eventi,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Terremoti aggiornati: ${eventi.length} eventi negli ultimi 30 giorni`);
}

// ---------------------------------------------------------------------

async function main() {
  const jobs = [
    ["meteo", ingestMeteo()],
    ["notizie", ingestNotizie()],
    ["vento", ingestVento()],
    ["viabilita", ingestViabilita()],
    ["carburanti", ingestCarburanti()],
    ["eventi", ingestEventi()],
    ["qualita-aria", ingestQualitaAria()],
    ["voli", ingestVoli()],
    ["pioggia", ingestPioggia()],
    ["temperatura", ingestTemperatura()],
    ["fiumi", ingestFiumi()],
    ["mare", ingestMare()],
    ["balneazione", ingestBalneazione()],
    ["farmacie", ingestFarmacie()],
    ["strutture-ricettive", ingestStruttureRicettive()],
    ["ozono", ingestOzono()],
    ["no2", ingestNo2()],
    ["pm25", ingestPm25()],
    ["pollini", ingestPollini()],
    ["calcio", ingestCalcio()],
    ["basket", ingestBasket()],
    ["baseball", ingestBaseballFvg()],
    ["tennis", ingestTennis()],
    ["sci", ingestSci()],
    ["webcam-osmer", ingestWebcamOsmer()],
    ["radar-meteo", ingestRadarMeteo()],
    ["terremoti", ingestTerremoti()],
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
