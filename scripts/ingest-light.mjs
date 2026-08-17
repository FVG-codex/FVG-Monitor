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
  trieste: 212, // "Trieste" — verificata, ha tutti i sensori vento
  udine: 558, // "Udine S+M" — da verificare
  gorizia: 65, // "Gorizia aeroporto" — da verificare
  pordenone: 567, // "Pordenone S+M" — da verificare
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
  const nomiStazioni = { trieste: "Trieste", udine: "Udine S+M", gorizia: "Gorizia aeroporto", pordenone: "Pordenone S+M" };

  await Promise.all(
    Object.entries(STAZIONE_VENTO_PER_PROVINCIA).map(([provincia, stationId]) =>
      ingestVentoProvincia(provincia, stationId, nomiStazioni[provincia], ZONA_PER_PROVINCIA[provincia])
    )
  );
}

// ---------------------------------------------------------------------

async function main() {
  const risultati = await Promise.allSettled([ingestMeteo(), ingestNotizie(), ingestVento()]);
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
