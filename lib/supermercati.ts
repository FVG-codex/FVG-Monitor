import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, type StatoApertura } from "@/lib/farmacie";

import datiGorizia from "@/lib/data/supermercati-gorizia.json";
import datiPordenone from "@/lib/data/supermercati-pordenone.json";
import datiTrieste from "@/lib/data/supermercati-trieste.json";
import datiUdine from "@/lib/data/supermercati-udine.json";

export { adessoEuropeRome };

// Commercio — Supermercati (10/09/2026). Prima categoria della nuova
// sezione "Commercio" del menù (altre attività commerciali verranno
// aggiunte in futuro, vedi lib/struttureRicettive.ts per il precedente
// "hub con più categorie" già in uso per Sport/Strutture ricettive).
//
// A differenza di farmacie/strutture ricettive, QUESTO dato non viene da
// un dataset Socrata regionale né da uno scraping: è stato fornito
// direttamente dall'utente come 4 file JSON (uno per provincia),
// compilati a mano/con verifica su Google Maps e i siti delle singole
// insegne (vedi campo `fonte`/`note_verifica` di ogni voce). Per questo
// NON passa da ingest-light.mjs/Supabase come gli altri moduli del
// sito: è un dataset statico, importato direttamente nel bundle (stesso
// pattern di lib/aviostrutture.ts) e aggiornato solo quando l'utente
// fornirà un nuovo file.
//
// Limiti noti nel dato (documentati qui, non nascosti in UI). Il file
// Udine è stato sostituito l'11/09/2026 con una versione completa
// fornita dall'utente ("Ecco la lista completa della provincia di
// Udine, aggiorna"): 107 → 144 voci, `scope` non più "prima
// ricognizione strutturata" ma allineato alle altre 3 province
// ("supermercati, ipermercati e discount... esclusi minimarket e
// botteghe"), e la maggior parte delle voci ora ha coordinate reali.
// Restano null solo 15 voci su 144 (UD-005, UD-017, UD-023, UD-030,
// UD-039, UD-044, UD-049, UD-061, UD-064, UD-067, UD-068, UD-121,
// UD-127, UD-132, UD-133), ciascuna con `note_verifica` che segnala
// esplicitamente "Coordinate non risolte automaticamente."
// — non compaiono quindi sulla mappa, solo nell'elenco testuale. Il
// flag `orari_non_verificati: true` resta invece su 141 voci su 144
// (quasi tutte, invariato rispetto al file precedente) — mostrato con
// una piccola nota "orario non confermato" invece di ometterlo o darlo
// per buono. Le altre province hanno singole voci con
// `orari_non_verificati: true` (Gorizia 6, Pordenone 31).

export type FasciaOrariaSettimanale = { apre: string; chiude: string }; // "HH:MM"

export type OrariSettimana = {
  lunedi: FasciaOrariaSettimanale[];
  martedi: FasciaOrariaSettimanale[];
  mercoledi: FasciaOrariaSettimanale[];
  giovedi: FasciaOrariaSettimanale[];
  venerdi: FasciaOrariaSettimanale[];
  sabato: FasciaOrariaSettimanale[];
  domenica: FasciaOrariaSettimanale[];
};

export type CategoriaSupermercato = "Supermercato" | "Ipermercato" | "Discount";

export type VoceSupermercato = {
  id: string;
  nome: string;
  insegna: string;
  categoria: CategoriaSupermercato;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: ProvinciaSlug;
  lat: number | null;
  lon: number | null;
  telefono: string | null;
  sito: string | null;
  orari: OrariSettimana;
  apertura24h: boolean;
  temporaneamenteChiuso: boolean;
  orariNonVerificati: boolean;
};

const ABBR_TO_SLUG: Record<string, ProvinciaSlug> = { TS: "trieste", UD: "udine", GO: "gorizia", PN: "pordenone" };

type RecordGrezzo = {
  id: string;
  nome: string;
  insegna: string;
  categoria: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  latitudine: number | null;
  longitudine: number | null;
  telefono: string;
  sito_pagina_ufficiale: string;
  orari: Record<string, { apre: string; chiude: string }[]>;
  apertura_24h: boolean;
  temporaneamente_chiuso: boolean;
  orari_non_verificati: boolean;
};

function normalizza(r: RecordGrezzo): VoceSupermercato {
  return {
    id: r.id,
    nome: r.nome,
    insegna: r.insegna,
    categoria: r.categoria as CategoriaSupermercato,
    indirizzo: r.indirizzo,
    cap: r.cap,
    comune: r.comune,
    provincia: ABBR_TO_SLUG[r.provincia] ?? "trieste",
    lat: r.latitudine,
    lon: r.longitudine,
    telefono: r.telefono || null,
    sito: r.sito_pagina_ufficiale || null,
    orari: r.orari as OrariSettimana,
    apertura24h: r.apertura_24h,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
    orariNonVerificati: r.orari_non_verificati,
  };
}

export const SUPERMERCATI_PER_PROVINCIA: Record<ProvinciaSlug, VoceSupermercato[]> = {
  gorizia: (datiGorizia.records as RecordGrezzo[]).map(normalizza),
  pordenone: (datiPordenone.records as RecordGrezzo[]).map(normalizza),
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: (datiUdine.records as RecordGrezzo[]).map(normalizza),
};

export const SUPERMERCATI_TUTTI: VoceSupermercato[] = [
  ...SUPERMERCATI_PER_PROVINCIA.trieste,
  ...SUPERMERCATI_PER_PROVINCIA.udine,
  ...SUPERMERCATI_PER_PROVINCIA.gorizia,
  ...SUPERMERCATI_PER_PROVINCIA.pordenone,
];

export const CATEGORIE_SUPERMERCATO: CategoriaSupermercato[] = ["Supermercato", "Ipermercato", "Discount"];

// Giorno della settimana (chiave di OrariSettimana) a partire da "adesso"
// nel formato "YYYY-MM-DDTHH:MM" prodotto da adessoEuropeRome() — stessa
// funzione già usata per le farmacie (fuso Europe/Rome, non quello del
// browser di chi visita). Si usa solo la parte data, interpretata come
// UTC mezzanotte: per un giorno di calendario già corretto (Europe/Rome)
// questo dà lo stesso giorno della settimana ovunque si trovi il
// visitatore, evitando un secondo cambio di fuso indesiderato.
const GIORNI: (keyof OrariSettimana)[] = [
  "domenica",
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
];

export function giornoSettimana(adesso: string): keyof OrariSettimana {
  const dataPura = adesso.slice(0, 10);
  const indice = new Date(`${dataPura}T00:00:00Z`).getUTCDay();
  return GIORNI[indice];
}

// "Aperta ora"/"Chiusa ora" — a differenza delle farmacie (orari
// puntuali di UNA giornata, ISO con data), qui gli orari sono
// SETTIMANALI ricorrenti ("HH:MM" senza data): niente concetto di
// "sconosciuto per ingestione in ritardo" (non c'è nessuna ingestione,
// il dato è statico), quindi un giorno con array vuoto è semplicemente
// "chiuso oggi" — mai "sconosciuto" a meno che l'orario non sia
// verificato (vedi `orariNonVerificati` sopra, mostrato a parte come
// nota testuale, non come terzo stato del pallino).
export function statoAperturaSupermercato(v: VoceSupermercato, adesso: string): StatoApertura {
  if (v.temporaneamenteChiuso) return "chiusa";
  if (v.apertura24h) return "aperta";

  const giorno = giornoSettimana(adesso);
  const fasceOggi = v.orari[giorno] ?? [];
  if (fasceOggi.length === 0) return "chiusa";

  const oraAdesso = adesso.slice(11, 16); // "HH:MM"
  const aperta = fasceOggi.some((f) => oraAdesso >= f.apre && oraAdesso < f.chiude);
  return aperta ? "aperta" : "chiusa";
}

export function formattaFasceGiorno(fasce: FasciaOrariaSettimanale[]): string {
  if (fasce.length === 0) return "Chiuso";
  return fasce.map((f) => `${f.apre}–${f.chiude}`).join(", ");
}

export const NOMI_GIORNO: Record<keyof OrariSettimana, string> = {
  lunedi: "Lun",
  martedi: "Mar",
  mercoledi: "Mer",
  giovedi: "Gio",
  venerdi: "Ven",
  sabato: "Sab",
  domenica: "Dom",
};

export const ORDINE_GIORNI: (keyof OrariSettimana)[] = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];
