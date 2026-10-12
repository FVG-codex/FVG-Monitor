import type { ProvinciaSlug } from "@/lib/province";

// Guardie Mediche (Continuità Assistenziale) — nuova sezione sotto
// Sanità (12/10/2026, richiesta dall'utente). Fonte: endpoint JSON
// pubblico di sapi.sanita.fvg.it, fornito direttamente dall'utente come
// URL (non scoperto da questa sessione) — vedi ingestGuardieMediche() in
// scripts/ingest-light.mjs per i dettagli di ingestione, il perché del
// parametro APID nell'URL, e la nota sulla verifica dello schema (fatta
// tramite uno strumento di lettura pagine web, perché l'accesso diretto
// al dominio è bloccato dall'ambiente di sviluppo usato per questa
// sessione — nessuna chiamata diretta è mai stata eseguita qui).
//
// Pattern Supabase "live" come Farmacie/Pronto Soccorso (non dataset
// statico come Cliniche/Dentisti/Veterinari): la fonte è un'API
// regionale ufficiale con dati che possono cambiare, non un'esportazione
// che l'utente deve rifornire a mano.
//
// Nota importante sull'orario: tutti i 35 record osservati il
// 12/10/2026 condividono LO STESSO orario (feriale/prefestivo/festivo) e
// LO STESSO numero di telefono (116117) — non è un dato per singola
// sede ma il servizio unico di Continuità Assistenziale regionale.
// Per questo è un campo separato (`orari`) invece di essere ripetuto su
// ciascuna voce di `GuardieMedicheProvincia.sedi`.
//
// Due sedi della fonte hanno un comune "fuori standard" (un nome di
// località invece di un vero codice ISTAT: "Duino Aurisina" e
// "Palmanova-frazione Jalmicco") — gestito lato ingestione con una
// mappa di fallback per nome; qui arriva già come provincia corretta,
// nessuna gestione speciale lato frontend.

export type VoceGuardiaMedica = {
  azienda: string | null;
  distretto: string | null;
  via: string | null;
  presso: string | null;
  comune: string;
  // Solo i NOMI (non gli id, inconsistenti nella fonte — a volte codici
  // ISTAT, a volte nomi di località, a volte descrizioni composite come
  // "Taipana (escluso frazione Prosenicco)") dei comuni/località
  // ulteriori servite dalla stessa sede, quando presente nella fonte
  // (soprattutto sedi montane/rurali con un unico presidio per più
  // comuni) — null se la sede serve solo il proprio comune.
  comuniCompresi: string[] | null;
  lat: number | null;
  lon: number | null;
};

export type GuardieMedicheProvincia = { totale: number; sedi: VoceGuardiaMedica[] };

// Orario e telefono del servizio di Continuità Assistenziale: UNICO per
// tutta la regione (verificato su tutti i 35 record della fonte il
// 12/10/2026, tutti identici) — non per singola sede, vedi nota sopra.
export type OrariGuardiaMedica = {
  feriale: string | null; // es. "dalle 20 alle 8 del giorno dopo"
  prefestivo: string | null;
  festivo: string | null;
  telefono: string | null; // "116117"
};

export type SnapshotGuardieMediche = {
  orari: OrariGuardiaMedica;
  per_provincia: Partial<Record<ProvinciaSlug, GuardieMedicheProvincia>>;
};
