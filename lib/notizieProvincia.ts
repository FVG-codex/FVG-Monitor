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

// Province già coperte da questa sezione: Trieste (05/09/2026), Udine
// (06/09/2026), Gorizia (06/09/2026, solo 2 delle 4 fonti indicate
// dall'utente — le altre 2 sono bloccate per questa sessione, vedi
// FONTI_NOTIZIE_GORIZIA in scripts/ingest-light.mjs) — Pordenone
// arriverà in una sessione successiva, su richiesta dell'utente — vedi
// PROVINCE_NOTIZIE in scripts/ingest-light.mjs per le fonti configurate
// per ciascuna. Tenuto come lista esplicita invece che derivato da
// PROVINCE_LIST proprio perché il rollout è volutamente parziale, non un
// elenco completo in attesa di dati.
export const PROVINCE_NOTIZIE_ATTIVE: ProvinciaSlug[] = ["trieste", "udine", "gorizia"];
