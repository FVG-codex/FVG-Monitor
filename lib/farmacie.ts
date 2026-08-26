import type { ProvinciaSlug } from "@/lib/province";

// Farmacie — dataset Socrata "Farmacie di turno" (jbxd-m6xe) su
// dati.friuliveneziagiulia.it. Vedi ingestFarmacie() in
// scripts/ingest-light.mjs per i dettagli di ingestione e la nota
// importante sulla finestra dati (solo "oggi + domani mattina", non una
// tabella oraria settimanale permanente).
//
// Un'unica snapshot Supabase ("farmacie") contiene TUTTE le farmacie
// della regione (non solo quelle di turno oggi), ciascuna con TUTTE le
// proprie fasce orarie di oggi (`orariOggi`: normali E turno). Due
// pagine leggono la stessa snapshot filtrandola client-side:
// `/farmacie-tutte` (tutte) e `/farmacie-di-turno` (solo chi ha almeno
// una fascia `tipo === "turno"` oggi, via `diTurnoOggi()` sotto) — hub
// `/farmacie` con una card per ciascuna, stesso pattern di Sport e
// Strutture ricettive.

export type FasciaOraria = {
  da: string; // ISO, es. "2026-08-26T09:00:00.000"
  a: string | null;
  tipo: "normale" | "turno";
};

export type VoceFarmacia = {
  nome: string;
  comune: string | null;
  indirizzo: string | null;
  telefono: string | null;
  lat: number | null;
  lon: number | null;
  orariOggi: FasciaOraria[];
};

export type FarmacieProvincia = { totale: number; farmacie: VoceFarmacia[] };

export type SnapshotFarmacie = {
  data: string; // "YYYY-MM-DD", Europe/Rome
  per_provincia: Partial<Record<ProvinciaSlug, FarmacieProvincia>>;
};

export function diTurnoOggi(f: VoceFarmacia): boolean {
  return f.orariOggi.some((o) => o.tipo === "turno");
}

// Estrae "HH:MM" direttamente dalla stringa ISO, senza passare da Date
// (stesso motivo documentato in ingest-light.mjs: non è garantito che
// l'ora nel dataset sia UTC, e gli orari osservati sono coerenti solo
// con "ora locale già inclusa nella stringa").
function orario(iso: string): string {
  return iso.slice(11, 16);
}

export function formattaFascia(f: FasciaOraria): string {
  const giornoDa = f.da.slice(0, 10);
  const finisceDomani = f.a && f.a.slice(0, 10) !== giornoDa;
  const etichetta = f.tipo === "turno" ? "Turno" : "Orario";
  return `${etichetta} ${orario(f.da)}–${f.a ? orario(f.a) : "?"}${finisceDomani ? " (giorno succ.)" : ""}`;
}
