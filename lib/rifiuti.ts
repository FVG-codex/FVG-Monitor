// Ambiente → Servizi → Rifiuti, calendario raccolta differenziata
// (17/09/2026, richiesto dall'utente — vedi il commento esteso sopra
// ingestRifiuti() in scripts/ingest-light.mjs per fonte (Isontina
// Ambiente), metodo di verifica con HTML reale e perché l'architettura
// del pacchetto ricevuto dall'utente (generato con ChatGPT) non è stata
// adottata).
//
// Tipi condivisi tra RifiutiPage.tsx e qualunque altro componente legga
// lo snapshot "rifiuti:isontina" — devono corrispondere esattamente
// alla forma scritta da ingestRifiuti() in scripts/ingest-light.mjs.

export type TipoRifiuto = "paper" | "organic" | "plastic_metals" | "residual";

export type GiornoRaccolta = {
  data: string; // YYYY-MM-DD
  tipi: TipoRifiuto[];
};

export type AreaRifiuti = {
  area: string | null; // "A".."F", o null se il comune non ha aree distinte
  giorni: GiornoRaccolta[];
};

export type CentroRaccolta = {
  indirizzo: string | null;
  apertura: string | null;
  materiali: string[];
} | null;

export type ComuneRifiuti = {
  slug: string;
  nome: string;
  aree: AreaRifiuti[];
  centro_raccolta: CentroRaccolta;
  campane_vetro: string[];
  stale?: boolean;
};

export type SnapshotRifiuti = {
  comuni: ComuneRifiuti[];
  aggiornato_al: string;
};

export const ETICHETTA_TIPO: Record<TipoRifiuto, string> = {
  paper: "Carta e cartone",
  organic: "Organico umido",
  plastic_metals: "Plastica e lattine",
  residual: "Secco residuo",
};

// Stessi colori della legenda reale del sito (viola/marrone/giallo/
// grigio), così chi già conosce il calendario cartaceo/PDF riconosce
// subito i puntini. Valori fissi (non da tema) — non esiste ancora un
// token dedicato in tailwind.config.ts per questi 4 colori, e
// introdurne uno per un solo modulo non sembrava valesse la pena;
// stesso principio del "text-[#241B04]" già usato in neveImpianti.ts.
export const COLORE_TIPO: Record<TipoRifiuto, string> = {
  paper: "#9B6FD1",
  organic: "#8B5E3C",
  plastic_metals: "#E8B93E",
  residual: "#8A8F98",
};

export function formattaDataRifiuti(dataIso: string): string {
  const d = new Date(`${dataIso}T12:00:00Z`);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

// Raggruppa i giorni di un'area per data, unendo eventuali duplicati
// (può capitare ai confini fra due mesi se le finestre richieste si
// sovrappongono) e ordina cronologicamente.
export function giorniOrdinati(area: AreaRifiuti | undefined): GiornoRaccolta[] {
  if (!area) return [];
  const perData = new Map<string, Set<TipoRifiuto>>();
  for (const g of area.giorni) {
    if (!perData.has(g.data)) perData.set(g.data, new Set());
    for (const t of g.tipi) perData.get(g.data)!.add(t);
  }
  return [...perData.entries()]
    .map(([data, tipi]) => ({ data, tipi: [...tipi] }))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export function prossimeRaccolte(area: AreaRifiuti | undefined, oggiIso: string, n = 5): GiornoRaccolta[] {
  return giorniOrdinati(area)
    .filter((g) => g.data >= oggiIso)
    .slice(0, n);
}
