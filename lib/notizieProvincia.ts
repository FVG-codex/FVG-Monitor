import type { ProvinciaSlug } from "@/lib/province";

export type NotiziaProvincia = {
  titolo: string;
  link: string;
  data: string;
  fonte: string;
};

export type SnapshotNotizieProvincia = {
  items: NotiziaProvincia[];
  fonti: { fonte: string; fonte_url: string }[];
};

// Tutte e 4 le province sono ora coperte da questa sezione: Trieste
// (05/09/2026), Udine e Gorizia (06/09/2026), Pordenone (08/09/2026) —
// rollout completato. Vedi PROVINCE_NOTIZIE in scripts/ingest-light.mjs
// per le fonti configurate per ciascuna (Gorizia in particolare aveva
// avuto un rollout iniziale parziale, 2 fonti su 4, poi completato lo
// stesso giorno). Tenuta come lista esplicita (non derivata da
// PROVINCE_LIST) per coerenza con la cronologia del rollout, anche ora
// che è completo — un nuovo elenco province da questo file non
// aggiungerebbe automaticamente le fonti in scripts/ingest-light.mjs,
// quindi la derivazione implicita non eviterebbe comunque una modifica
// manuale in un secondo file.
export const PROVINCE_NOTIZIE_ATTIVE: ProvinciaSlug[] = ["trieste", "udine", "gorizia", "pordenone"];
