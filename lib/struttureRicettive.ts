import type { ProvinciaSlug } from "@/lib/province";

// Strutture ricettive — 8 registri regionali distinti, tutti dataset
// Socrata su dati.friuliveneziagiulia.it con lo stesso schema minimale:
// provincia, comune, denominazione, email (opzionale), sito (opzionale).
// NESSUN indirizzo, telefono o coordinata pubblicati dalla fonte — non
// un'omissione nostra, un limite del dato stesso: niente mappa possibile.
// Vedi ingestStruttureRicettive() in scripts/ingest-light.mjs per i
// dettagli di ingestione (un'unica funzione, un'unica snapshot Supabase
// "strutture-ricettive" con tutti e 8 i tipi).

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

export type VoceStrutturaRicettiva = {
  nome: string;
  comune: string | null;
  email: string | null;
  sito: string | null;
};

export type StruttureTipoSnapshot = {
  totale: number;
  per_provincia: Partial<Record<ProvinciaSlug, VoceStrutturaRicettiva[]>>;
};

export type SnapshotStruttureRicettive = {
  aggiornato_al: string;
  tipi: Partial<Record<TipoStrutturaSlug, StruttureTipoSnapshot>>;
};
