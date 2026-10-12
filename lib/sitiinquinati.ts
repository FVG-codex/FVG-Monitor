import type { ProvinciaSlug } from "@/lib/province";

import dati from "@/lib/data/siti-inquinati.json";

// Ambiente → Siti inquinati (12/10/2026). Dataset STATICO fornito
// dall'utente (CSV esportato da dati.friuliveneziagiulia.it, dataset
// Socrata "Censimento dei siti inquinati 2025", id `ti84-itu7`) — stesso
// pattern di dato statico già usato per Cliniche/Dentisti/Veterinari:
// nessun ingestX()/Supabase, un unico file JSON importato direttamente
// nel bundle (qui non diviso per provincia come quei moduli, perché la
// fonte stessa è un unico censimento regionale, non consegnato provincia
// per provincia).
//
// Verifica dei nomi di campo fatta tramite uno screenshot della pagina
// "Colonne" del dataset mandato dall'utente (WebFetch/curl verso
// dati.friuliveneziagiulia.it risultavano bloccati da questa sessione,
// intero dominio irraggiungibile — vedi commento nel documento di
// progetto). Schema ufficiale (7 colonne):
// - `codice_sito`: numero fascicolo attribuito al sito.
// - `categoriasito`: "C" = comunale, "I" = regionale, "N" = nazionale
//   (livello amministrativo di competenza del procedimento, NON legato
//   a industriale/commerciale).
// - `siglapro`: sigla provincia (TS/GO/UD/PN).
// - `dencomune`: comune.
// - `stato_pratica_diz`: "Istruttoria in atto" (procedimento in corso) o
//   "Archiviata" (procedimento concluso) — **attenzione**: "Archiviata"
//   NON significa "sito bonificato", solo che l'iter è stato chiuso. Lo
//   stadio raggiunto (sotto) è ciò che indica l'esito reale.
// - `tipologia_inquinante`: testo libero, quasi sempre vuoto (119 record
//   su 1659) — natura dell'inquinante quando nota (superamento CSR per i
//   suoli o CSC per le acque sotterranee).
// - `stadio_diz`: fase del procedimento (per gli archiviati, la fase
//   raggiunta al momento dell'archiviazione) — anch'esso vuoto su 273
//   record su 1659.
//
// **`codice_sito` non è una chiave univoca da sola**: un centinaio di
// codici compaiono su più righe quando lo stesso procedimento coinvolge
// più comuni (es. una falda o un'infrastruttura lineare che attraversa
// più territori) — è un dato corretto, non un duplicato da rimuovere.
// Verificato che la coppia (codice_sito, dencomune) è invece univoca su
// tutte le 1659 righe del file ricevuto, usata qui come chiave React.
// Nessuna coordinata nel dataset (solo comune/provincia testo libero) —
// pagina a elenco/tabella, non a mappa, diversamente da ogni altra
// sezione "a struttura" del sito (Farmacie/Cliniche/Dentisti/Veterinari/
// Supermercati).

export type CategoriaSito = "comunale" | "regionale" | "nazionale";
export type StatoPraticaSito = "istruttoria_in_atto" | "archiviata";

export type VoceSitoInquinato = {
  id: string; // `${codiceSito}__${comune}` — vedi nota sopra sulla chiave
  codiceSito: string;
  categoria: CategoriaSito;
  provincia: ProvinciaSlug;
  comune: string;
  statoPratica: StatoPraticaSito;
  tipologiaInquinante: string | null;
  stadio: string | null;
};

const ABBR_TO_SLUG: Record<string, ProvinciaSlug> = { TS: "trieste", UD: "udine", GO: "gorizia", PN: "pordenone" };

const CATEGORIA_DA_SIGLA: Record<string, CategoriaSito> = {
  C: "comunale",
  I: "regionale",
  N: "nazionale",
};

const STATO_DA_TESTO: Record<string, StatoPraticaSito> = {
  "Istruttoria in atto": "istruttoria_in_atto",
  Archiviata: "archiviata",
};

type RecordGrezzo = {
  codice_sito: string;
  categoriasito: string;
  siglapro: string;
  dencomune: string;
  stato_pratica_diz: string;
  tipologia_inquinante: string | null;
  stadio_diz: string | null;
};

function normalizza(r: RecordGrezzo): VoceSitoInquinato {
  return {
    id: `${r.codice_sito}__${r.dencomune}`,
    codiceSito: r.codice_sito,
    categoria: CATEGORIA_DA_SIGLA[r.categoriasito] ?? "regionale",
    provincia: ABBR_TO_SLUG[r.siglapro] ?? "trieste",
    comune: r.dencomune,
    statoPratica: STATO_DA_TESTO[r.stato_pratica_diz] ?? "istruttoria_in_atto",
    tipologiaInquinante: r.tipologia_inquinante || null,
    stadio: r.stadio_diz || null,
  };
}

const TUTTE_LE_VOCI: VoceSitoInquinato[] = (dati.records as RecordGrezzo[]).map(normalizza);

export const SITI_INQUINATI_PER_PROVINCIA: Record<ProvinciaSlug, VoceSitoInquinato[]> = {
  trieste: TUTTE_LE_VOCI.filter((v) => v.provincia === "trieste"),
  udine: TUTTE_LE_VOCI.filter((v) => v.provincia === "udine"),
  gorizia: TUTTE_LE_VOCI.filter((v) => v.provincia === "gorizia"),
  pordenone: TUTTE_LE_VOCI.filter((v) => v.provincia === "pordenone"),
};
