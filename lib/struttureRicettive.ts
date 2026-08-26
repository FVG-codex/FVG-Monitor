import type { ProvinciaSlug } from "@/lib/province";

// Strutture ricettive — 8 registri regionali distinti, tutti dataset
// Socrata su dati.friuliveneziagiulia.it con lo stesso schema minimale:
// provincia, comune, denominazione, email (opzionale), sito (opzionale).
// NESSUN indirizzo, telefono o coordinata pubblicati dalla fonte — non
// un'omissione nostra, un limite del dato stesso.
// Vedi ingestStruttureRicettive() in scripts/ingest-light.mjs per i
// dettagli di ingestione (un'unica funzione, un'unica snapshot Supabase
// "strutture-ricettive" con tutti e 8 i tipi).
//
// Arricchimento contatti (26/08/2026): indirizzo/
// telefono/sito/coordinate NON vengono dal dataset Regione ma da un
// abbinamento nome+comune best-effort (mai certo — vedi `contatti`
// sotto e le note in ingest-light.mjs) con due fonti possibili:
// turismofvg.it (scraping incrementale, più ricco, precedenza quando
// disponibile — oggi solo per Agriturismi) oppure OpenStreetMap (per
// tutto il resto). Assente su una parte delle voci (la copertura reale
// varia per tipo/fonte, vedi claude/fvgmonitor-stato.md). Ancora nessuna
// mappa: le coordinate, quando presenti, sono anch'esse solo un
// arricchimento best-effort, non un dato ufficiale della Regione.

export type TipoStrutturaSlug =
  | "bb"
  | "affittacamere"
  | "campeggi"
  | "agriturismi"
  | "alberghi-diffusi"
  | "sociali"
  | "marina"
  | "rifugi";

export type TipoStrutturaInfo = {
  slug: TipoStrutturaSlug;
  nome: string;
  href: string;
  descrizione: string;
};

export const TIPI_STRUTTURA: Record<TipoStrutturaSlug, TipoStrutturaInfo> = {
  bb: {
    slug: "bb",
    nome: "Bed & Breakfast",
    href: "/bed-and-breakfast",
    descrizione: "Bed & Breakfast certificati dai Comuni e dalla Direzione centrale attività produttive",
  },
  affittacamere: {
    slug: "affittacamere",
    nome: "Affittacamere",
    href: "/affittacamere",
    descrizione: "Strutture di tipologia Affitta Camere certificate dai Comuni",
  },
  campeggi: {
    slug: "campeggi",
    nome: "Campeggi e Villaggi Turistici",
    href: "/campeggi",
    descrizione: "Campeggi e Villaggi Turistici certificati dai Comuni",
  },
  agriturismi: {
    slug: "agriturismi",
    nome: "Alloggi Agrituristici",
    href: "/agriturismi",
    descrizione: "Alloggi Agrituristici certificati dai Comuni",
  },
  "alberghi-diffusi": {
    slug: "alberghi-diffusi",
    nome: "Alberghi Diffusi",
    href: "/alberghi-diffusi",
    descrizione: "Alberghi Diffusi certificati dai Comuni",
  },
  sociali: {
    slug: "sociali",
    nome: "Strutture Ricettive a carattere Sociale",
    href: "/strutture-sociali",
    descrizione: "Alberghi/ostelli per la gioventù, foresterie e simili, certificati dai Comuni",
  },
  marina: {
    slug: "marina",
    nome: "Dry Marina e Marina Resort",
    href: "/marina",
    descrizione: "Dry Marina e Marina Resort certificati dai Comuni",
  },
  rifugi: {
    slug: "rifugi",
    nome: "Rifugi Alpini Escursionistici",
    href: "/rifugi",
    descrizione: "Rifugi Alpini Escursionistici certificati dai Comuni",
  },
};

export const TIPI_STRUTTURA_LIST = Object.values(TIPI_STRUTTURA);

export const PROVINCIA_ABBR: Record<ProvinciaSlug, string> = {
  trieste: "TS",
  udine: "UD",
  gorizia: "GO",
  pordenone: "PN",
};

// `fonte` distingue le due provenienze possibili: "turismofvg" (scraping
// incrementale di turismofvg.it, più ricco — vedi ingestTurismoFvg in
// scripts/ingest-light.mjs, oggi copre solo Agriturismi) ha SEMPRE la
// precedenza quando disponibile; "osm" (OpenStreetMap) è il ripiego per
// tutto il resto. Mai i due combinati in una stessa voce.
export type ContattiArricchiti = {
  fonte: "osm" | "turismofvg";
  indirizzo?: string;
  telefono?: string;
  email?: string;
  sito?: string;
  // Solo da turismofvg.it — non presenti nel dato OSM.
  titolare?: string;
  cin?: string;
  lat?: number;
  lon?: number;
};

export type VoceStrutturaRicettiva = {
  nome: string;
  comune: string | null;
  email: string | null;
  sito: string | null;
  contatti: ContattiArricchiti | null;
};

export type StruttureTipoSnapshot = {
  totale: number;
  per_provincia: Partial<Record<ProvinciaSlug, VoceStrutturaRicettiva[]>>;
};

export type SnapshotStruttureRicettive = {
  aggiornato_al: string;
  tipi: Partial<Record<TipoStrutturaSlug, StruttureTipoSnapshot>>;
};
