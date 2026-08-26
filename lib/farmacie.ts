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

// "Aperta ora" / "Chiusa ora" (26/08/2026, richiesto dall'utente).
//
// "sconosciuto" quando la farmacia non ha nessuna fascia oggi (vedi
// nota sopra sulla finestra dati) — mostrato senza pallino invece di
// azzardare uno stato, coerente con "mai un dato inventato".
export type StatoApertura = "aperta" | "chiusa" | "sconosciuto";

export function statoApertura(f: VoceFarmacia, adesso: string): StatoApertura {
  if (f.orariOggi.length === 0) return "sconosciuto";
  // Confronto per stringa (non Date), sugli stessi 16 caratteri
  // "YYYY-MM-DDTHH:MM" usati da adessoEuropeRome() sotto — coerente con
  // gli orari_N_da/a del dataset, "ora locale già inclusa nella
  // stringa" (vedi ingest-light.mjs). Confrontare come Date rischierebbe
  // di applicare un fuso sbagliato una seconda volta, stesso motivo già
  // documentato altrove in questo file.
  const adessoMin = adesso.slice(0, 16);
  const aperta = f.orariOggi.some((fascia) => {
    const da = fascia.da.slice(0, 16);
    const a = fascia.a ? fascia.a.slice(0, 16) : null;
    return adessoMin >= da && (a === null || adessoMin < a);
  });
  return aperta ? "aperta" : "chiusa";
}

// "Adesso" in Europe/Rome (fuso della fonte, NON quello del browser di
// chi visita — un visitatore da un altro fuso avrebbe altrimenti un
// confronto sbagliato), formato "YYYY-MM-DDTHH:MM" — stesso formato
// (troncato) dei valori orari_N_da/a del dataset, per il confronto per
// stringa in statoApertura(). `hourCycle: "h23"` esplicito: alcuni
// ambienti restituiscono "24:00" invece di "00:00" a mezzanotte con
// `hour12: false` da solo.
export function adessoEuropeRome(): string {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (tipo: string) => parti.find((p) => p.type === tipo)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
