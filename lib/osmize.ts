import dati from "@/lib/data/osmize.json";

// Turismo → Osmize (13/10/2026). Dataset STATICO raccolto una tantum dal
// sito osmize.com su richiesta esplicita dell'utente: "Riesci a recuperare i
// dati per creare un elenco delle 'osmize' da qui?
// https://www.osmize.com/". Scelte confermate dall'utente tramite due
// AskUserQuestion: (1) raccogliere TUTTE le osmize, non solo le ~10
// attualmente aperte ("Tutte, circa 90"); (2) NON mostrare le date di
// apertura stagionale, mettendo invece un link diretto alla pagina ufficiale
// per ciascuna voce ("Non le mostro, solo link al sito ufficiale").
//
// **Perché statico e non live**: osmize.com non ha nessuna API — l'elenco
// completo richiede di visitare singolarmente ogni pagina `/<localita>/`
// (42 località trovate, dall'elenco del sito stesso incrociato con il
// sitemap). **Il sitemap.xml del sito è risultato inaffidabile**: un
// controllo incrociato su più località (Sgonico, Malchina, Rupingrande,
// Samatorza, Sant'Antonio in Bosco) ha mostrato sia voci presenti nel
// sitemap ma assenti dalla pagina live, sia il contrario — quindi si è
// scelto di considerare autoritative solo le pagine `/<localita>/` lette
// live, non il sitemap. Le pagine di dettaglio (92 osmize su 42 località)
// sono poi state visitate in parallelo da 8 sotto-agenti per estrarre nome,
// indirizzo, telefono, prodotti venduti, una descrizione ORIGINALE (non una
// copia del testo della scheda, per tutela del copyright) e le coordinate
// geografiche dalla mappa incorporata in ciascuna pagina.
//
// **Perché NON ci sono date di apertura/stato aperta-chiusa**: a differenza
// di Musei (catalogo permanente), le osmize aprono a rotazione per pochi
// giorni/settimane all'anno e queste date cambiano nel giro di pochi giorni;
// il sito non ha un'API, quindi un dataset statico non potrebbe mostrare uno
// stato "aperto ora" affidabile — mostrarlo sarebbe peggio che non mostrarlo,
// perché sembrerebbe aggiornato quando non lo è. Scelta dell'utente: ogni
// scheda riporta un link diretto alla pagina ufficiale (`url`) dove
// verificare le date correnti, stesso principio della "Scheda ufficiale
// ERPAC" già usata in Musei.
//
// **Quirk noti della fonte** (non errori di questa raccolta, segnalati nel
// campo `note` quando rilevati dai sotto-agenti): diversi slug degli URL non
// corrispondono al nome visualizzato oggi sulla pagina (es. cambi di
// gestione familiare); alcune osmize condividono indirizzo/coordinate con
// altre della stessa località (edifici cooperativi, es. varie osmize di
// Longera); alcune osmize sono fisicamente oltreconfine in Slovenia pur
// comparendo sotto una località italiana del catalogo (es. Boriano,
// Castagnevizza, Coljava, Duttogliano); molte pagine non hanno ancora una
// descrizione o un elenco prodotti pubblicati dal gestore sul sito — in
// questi casi `prodotti` è `null` e `descrizione` lo segnala onestamente
// invece di inventare contenuti.
//
// `localita` è il nome fine-grained usato dalla navigazione del sito stesso
// (es. "Longera", "Malchina") — preferito a un campo "comune" ricavato dagli
// indirizzi testuali, che nelle 92 schede sono scritti in modo incoerente fra
// loro (talvolta il comune è tra parentesi, talvolta è la provincia).

export type VoceOsmiza = {
  localita: string;
  localitaSlug: string;
  osmizaSlug: string;
  url: string;
  nome: string;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  prodotti: string | null;
  descrizione: string;
  note: string;
};

type RecordGrezzo = {
  localita: string;
  localita_slug: string;
  osmiza_slug: string;
  url: string;
  nome: string;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  prodotti: string | null;
  descrizione: string;
  note: string;
};

type DatasetGrezzo = {
  fonte: string;
  data_raccolta: string;
  totale_raccolto: number;
  nota_raccolta: string;
  records: RecordGrezzo[];
};

function normalizza(r: RecordGrezzo): VoceOsmiza {
  return {
    localita: r.localita,
    localitaSlug: r.localita_slug,
    osmizaSlug: r.osmiza_slug,
    url: r.url,
    nome: r.nome,
    indirizzo: r.indirizzo || null,
    telefono: r.telefono || null,
    email: r.email || null,
    lat: r.lat,
    lon: r.lon,
    prodotti: r.prodotti || null,
    descrizione: r.descrizione,
    note: r.note || "",
  };
}

const DATI = dati as DatasetGrezzo;

export const OSMIZE: VoceOsmiza[] = DATI.records.map(normalizza);

export const OSMIZE_META = {
  fonte: DATI.fonte,
  dataRaccolta: DATI.data_raccolta,
  totaleRaccolto: DATI.totale_raccolto,
};

export const LOCALITA_OSMIZE: string[] = Array.from(new Set(OSMIZE.map((o) => o.localita))).sort((a, b) =>
  a.localeCompare(b, "it")
);

export function conteggioOsmizeLocalita(localita: string): number {
  return OSMIZE.filter((o) => o.localita === localita).length;
}
