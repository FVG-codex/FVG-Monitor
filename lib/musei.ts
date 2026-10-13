import type { ProvinciaSlug } from "@/lib/province";

import dati from "@/lib/data/musei.json";

// Turismo → Musei (13/10/2026). Dataset STATICO raccolto una tantum dal
// catalogo del patrimonio culturale ERPAC (patrimonioculturale.regione.fvg.it,
// sezione "Musei") su richiesta esplicita dell'utente: "Voglio una pagina, da
// inserire nella pagina turismo, che comprenda nome del museo, descrizione,
// orari, sito web e link ai biglietti". Stesso pattern di dato STATICO già
// usato per Siti inquinati (lib/sitiinquinati.ts)/Cliniche/Dentisti/
// Veterinari: nessun ingestX()/Supabase, un unico file JSON importato
// direttamente nel bundle.
//
// **Perché statico e non live (a differenza di Farmacie/Parchi e giardini)**:
// il catalogo ERPAC non è un'API aperta — l'elenco è paginato lato server con
// un meccanismo di navigazione completa (`?s_page=N`, non XHR/AJAX) e ogni
// scheda-museo vive su una pagina HTML a sé (`/museo/?s_id=XXXXXX`) priva di
// un endpoint dati strutturato. Una ri-raccolta periodica via GitHub Actions
// non è praticabile con gli strumenti di questa sessione (nessun accesso
// diretto curl/fetch al dominio, solo tramite lettura-pagina assistita) — per
// questo è uno scrape "una tantum", come già per Cliniche/Dentisti/Veterinari.
//
// **Come sono stati raccolti i dati (per trasparenza)**: l'elenco paginato
// (21 pagine da 9 musei, individuato grazie all'HTML della pagina `/musei`
// fornito dall'utente, che ha rivelato il parametro `s_page` dopo che i
// tentativi di indovinare l'URL — `/musei/page/2/`, `?s_paged=2` — erano
// falliti) ha dato i nomi e gli `s_id` di tutti i 189 musei dichiarati dal
// sito. Le pagine di dettaglio sono poi state visitate in parallelo da 9
// sotto-agenti (circa 21 ciascuno) per estrarre comune/provincia, un riassunto
// ORIGINALE di 2-3 frasi (non una copia del testo della scheda, per tutela del
// copyright) e gli eventuali link "Visita il sito".
//
// **Limite noto e dichiarato della fonte, non di questa raccolta**: nessuna
// delle 188 schede visitate riporta ORARI DI APERTURA o un LINK PER
// BIGLIETTI/PRENOTAZIONE — il catalogo ERPAC è una scheda di catalogazione
// scientifica del patrimonio, non un portale turistico. Questi due campi
// sono quindi SEMPRE `null` in questo dataset: non è un dato mancante per un
// problema di raccolta, è semplicemente un'informazione che la fonte non
// contiene. Mai inventato, come da richiesta esplicita dell'utente ("Tutti i
// 189, campi parziali" — opzione scelta esplicitamente dopo aver saputo che
// orari/biglietti non esistono in questa fonte).
//
// **189 dichiarati dal sito → 188 record raccolti**: durante la raccolta uno
// stesso `s_id` (440541) è comparso con due nomi diversi su due pagine elenco
// differenti ("Archivio Giuseppe Marchetti" e "Fondo calotipi cerati") per un
// errore di estrazione automatica di una pagina elenco — verificato due volte
// in modo indipendente visitando la pagina di dettaglio reale, che riporta un
// solo nome ("Fondo calotipi cerati"). Il nome fantasma è stato scartato
// invece di essere tenuto come 189° voce inventata. Separatamente, due s_id
// distinti (440556 e 440657) condividono lo stesso nome ("Museo provinciale
// della vita contadina Diogene Penzi") e lo stesso comune (San Vito al
// Tagliamento) — verificato che sono pagine realmente distinte nel catalogo,
// probabilmente relative a sedi/sezioni diverse della stessa collezione; non
// unificate, perché il catalogo stesso le tratta come due schede separate.
//
// **Alcune voci del catalogo non sono musei in senso stretto** ma siti
// archeologici/monumenti (es. Arco di Riccardo, Teatro romano di Trieste) o
// fondi/archivi fotografici conservati da un museo (es. vari "Fondo..."
// legati ai Civici Musei di Udine) — il catalogo ERPAC le classifica comunque
// sotto "Musei" nel suo elenco paginato, quindi sono incluse qui così come
// trovate, con una nota nel campo `note` quando il sotto-agente l'ha
// rilevato esplicitamente.
//
// Ogni record porta anche `schedaErpac`, il link alla pagina ufficiale della
// scheda sul sito ERPAC — mostrato nella pagina per permettere a chi legge di
// verificare/approfondire direttamente alla fonte, dato che la descrizione
// qui è un riassunto e non il testo integrale della scheda.

export type ProvinciaSiglaMuseo = "UD" | "GO" | "TS" | "PN";

export type VoceMuseo = {
  sId: string;
  nome: string;
  comune: string | null;
  provincia: ProvinciaSlug | null;
  provinciaSigla: ProvinciaSiglaMuseo | null;
  descrizione: string;
  sitiWeb: string[];
  orari: string | null;
  biglietti: string | null;
  note: string;
  schedaErpac: string;
};

type RecordGrezzo = {
  s_id: string;
  nome: string;
  comune: string | null;
  provincia: string | null;
  descrizione: string;
  siti_web: string[];
  orari: string | null;
  biglietti: string | null;
  note: string;
  scheda_erpac: string;
};

type DatasetGrezzo = {
  fonte: string;
  data_raccolta: string;
  totale_musei_dichiarati_dal_sito: number;
  totale_record_raccolti: number;
  nota_raccolta: string;
  records: RecordGrezzo[];
};

const SIGLA_TO_SLUG: Record<string, ProvinciaSlug> = { UD: "udine", GO: "gorizia", TS: "trieste", PN: "pordenone" };

function normalizza(r: RecordGrezzo): VoceMuseo {
  const sigla = (r.provincia as ProvinciaSiglaMuseo | null) ?? null;
  return {
    sId: r.s_id,
    nome: r.nome,
    comune: r.comune,
    provincia: sigla ? SIGLA_TO_SLUG[sigla] ?? null : null,
    provinciaSigla: sigla,
    descrizione: r.descrizione,
    sitiWeb: r.siti_web ?? [],
    orari: r.orari || null,
    biglietti: r.biglietti || null,
    note: r.note || "",
    schedaErpac: r.scheda_erpac,
  };
}

const DATI = dati as DatasetGrezzo;

export const MUSEI: VoceMuseo[] = DATI.records.map(normalizza);

export const MUSEI_META = {
  fonte: DATI.fonte,
  dataRaccolta: DATI.data_raccolta,
  totaleDichiaratoDalSito: DATI.totale_musei_dichiarati_dal_sito,
  totaleRaccolto: DATI.totale_record_raccolti,
};

export const PROVINCE_MUSEI_ATTIVE: ProvinciaSlug[] = ["trieste", "udine", "gorizia", "pordenone"];

export function conteggioMuseiProvincia(p: ProvinciaSlug): number {
  return MUSEI.filter((m) => m.provincia === p).length;
}
