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

// Province già coperte da questa sezione (05/09/2026, richiesta
// dell'utente): si parte da Trieste, le altre 3 arriveranno una alla
// volta in sessioni successive — vedi PROVINCE_NOTIZIE in
// scripts/ingest-light.mjs per le fonti configurate per ciascuna.
// Tenuto come lista esplicita invece che derivato da PROVINCE_LIST
// proprio perché il rollout è volutamente parziale, non un elenco
// completo in attesa di dati.
export const PROVINCE_NOTIZIE_ATTIVE: ProvinciaSlug[] = ["trieste"];
