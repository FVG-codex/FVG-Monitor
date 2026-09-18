// Ambiente → Servizi → Rifiuti, calendario raccolta differenziata
// (17/09/2026, richiesto dall'utente — vedi il commento esteso sopra
// ingestRifiuti() in scripts/ingest-light.mjs per fonte (Isontina
// Ambiente), metodo di verifica con HTML reale e perché l'architettura
// del pacchetto ricevuto dall'utente (generato con ChatGPT) non è stata
// adottata). Dal 18/09/2026 la sezione è organizzata per provincia (vedi
// PROVINCE_RIFIUTI_ATTIVE sotto) in vista dell'arrivo di un secondo
// gestore, A&T 2000, per i comuni della provincia di Udine — stesso
// pattern di rollout parziale già usato per Notizie
// (PROVINCE_NOTIZIE_ATTIVE in lib/notizieProvincia.ts).
//
// Tipi condivisi tra RifiutiPage.tsx e qualunque altro componente legga
// lo snapshot "rifiuti" (rinominato da "rifiuti:isontina" il
// 18/09/2026) — devono corrispondere esattamente alla forma scritta da
// ingestRifiuti() in scripts/ingest-light.mjs.

import type { ProvinciaSlug } from "@/lib/province";

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
  provincia: ProvinciaSlug;
  gestore: string; // es. "Isontina Ambiente", "A&T 2000"
  aree: AreaRifiuti[];
  centro_raccolta: CentroRaccolta;
  campane_vetro: string[];
  stale?: boolean;
};

export type SnapshotRifiuti = {
  comuni: ComuneRifiuti[];
  aggiornato_al: string;
};

// Solo Trieste e Gorizia sono coperte per ora (Isontina Ambiente).
// Udine arriverà con A&T 2000 (in ricognizione, vedi il commento sopra
// rifiutiIngestIsontina() in scripts/ingest-light.mjs); Pordenone non ha
// ancora un gestore integrato. Tenuta come lista esplicita — stesso
// principio già usato per PROVINCE_NOTIZIE_ATTIVE: derivarla dai comuni
// effettivamente presenti nello snapshot funzionerebbe già oggi, ma
// un elenco esplicito rende visibile a colpo d'occhio lo stato del
// rollout anche leggendo solo il codice, senza dati live sottomano.
export const PROVINCE_RIFIUTI_ATTIVE: ProvinciaSlug[] = ["gorizia", "trieste"];

// Raggruppa i comuni per provincia, nell'ordine di PROVINCE_RIFIUTI_ATTIVE
// (più eventuali province con dati presenti ma non ancora in quella
// lista, in coda) — così la UI può mostrare le tab già pronte per
// quando arriverà un nuovo gestore senza bisogno di modifiche qui.
export function comuniPerProvincia(comuni: ComuneRifiuti[]): Map<ProvinciaSlug, ComuneRifiuti[]> {
  const mappa = new Map<ProvinciaSlug, ComuneRifiuti[]>();
  for (const c of comuni) {
    if (!mappa.has(c.provincia)) mappa.set(c.provincia, []);
    mappa.get(c.provincia)!.push(c);
  }
  return mappa;
}

// Elenco delle province con almeno un comune nello snapshot, ordinate
// secondo PROVINCE_RIFIUTI_ATTIVE con eventuali extra in coda.
export function provinceConDati(comuni: ComuneRifiuti[]): ProvinciaSlug[] {
  const presenti = new Set(comuni.map((c) => c.provincia));
  const ordinate = PROVINCE_RIFIUTI_ATTIVE.filter((p) => presenti.has(p));
  const extra = [...presenti].filter((p) => !PROVINCE_RIFIUTI_ATTIVE.includes(p)).sort();
  return [...ordinate, ...extra];
}

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
