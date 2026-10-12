import type { ProvinciaSlug } from "@/lib/province";

// Parchi e giardini (storici) — nuova sezione sotto Ambiente (12/10/2026,
// richiesta dall'utente). Fonte: dataset regionale "efx9-g469" su
// dati.friuliveneziagiulia.it (Socrata) — vedi ingestParchiGiardini() in
// scripts/ingest-light.mjs per i dettagli di ingestione e il perché si
// usa l'endpoint SODA standard invece dell'URL di esportazione v3 dato
// dall'utente (stesso dataset, forma diversa).
//
// Pattern Supabase "live" come Farmacie/Balneazione/Guardie Mediche
// (non dataset statico come Cliniche/Dentisti/Siti inquinati): la fonte
// è un endpoint Socrata sullo stesso dominio già usato con successo da
// diversi altri moduli live di questo progetto.
//
// Il dataset include anche 49 "uccellande" (roccoli, strutture storiche
// per la cattura tradizionale degli uccelli) oltre a parchi/giardini in
// senso stretto — stessa categoria regionale "PG", mostrate con lo
// stesso meccanismo ma distinguibili tramite `tipi`/`tipoEtichetta`.

export type VoceParcoGiardino = {
  pk: string; // es. "PG_5" — id della fonte
  comune: string;
  localita: string | null;
  nome: string;
  // Tipologia normalizzata (minuscolo, es. ["giardino","parco"],
  // ["uccellanda"], ["giardino","parco","braida"]) — la fonte usa un
  // campo di testo libero con valori anche composti separati da "/ ",
  // qui già spezzati per permettere il filtro UI sulle 4 categorie
  // principali (giardino/parco/uccellanda/orto botanico).
  tipi: string[];
  tipoEtichetta: string; // testo originale della fonte, per la visualizzazione
  lat: number | null;
  lon: number | null;
};

export type ParchiGiardiniProvincia = { totale: number; voci: VoceParcoGiardino[] };

export type SnapshotParchiGiardini = {
  per_provincia: Partial<Record<ProvinciaSlug, ParchiGiardiniProvincia>>;
};

// Le 4 categorie principali con un numero di siti rilevante, usate come
// tastini di filtro — "braida"/"pomario" (1 sito ciascuno, sempre in
// combinazione con giardino/parco) non hanno un proprio tastino.
export const TIPI_PARCHI_GIARDINI_FILTRO = ["giardino", "parco", "uccellanda", "orto botanico"] as const;
export type TipoParcoGiardinoFiltro = (typeof TIPI_PARCHI_GIARDINI_FILTRO)[number];
