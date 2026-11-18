// Modulo "Social" (18/11/2026) — tipi condivisi tra le route
// app/api/social/[tipo]/… e i singoli generatori di contenuto
// (lib/social/meteoMattino.ts, …). Lo script di pubblicazione
// (scripts/social-publish.mjs) legge il JSON prodotto da queste route:
// se si cambia la forma di ContenutoSocial va aggiornato anche lì.

export type TestiPerPiattaforma = {
  /** Didascalia Telegram in HTML (parse_mode=HTML), max 1024 caratteri. */
  telegram: string;
  /** Testo del post Facebook (testo semplice, il link è cliccabile). */
  facebook: string;
  /** Didascalia Instagram (testo semplice, link non cliccabili → "link in bio"). */
  instagram: string;
  /** Testo per il canale WhatsApp (*grassetto*, _corsivo_), inviato come bozza. */
  whatsapp: string;
};

export type ContenutoSocial = {
  tipo: string;
  /** Giorno locale (Europe/Rome) a cui si riferisce il post, YYYY-MM-DD. */
  giorno: string;
  /** false = dati non ancora disponibili o troppo vecchi: lo script riproverà più tardi. */
  pronto: boolean;
  motivo?: string;
  testi: TestiPerPiattaforma;
};

/** Ogni tipo di post programmato implementa questa interfaccia. */
export type GeneratoreSocial<D> = {
  tipo: string;
  /** Carica i dati (da Supabase o, con demo=true, dati di esempio). */
  caricaDati(opzioni: { demo: boolean; giorno: string }): Promise<D>;
  /** Testi per le piattaforme + verifica che i dati siano pronti. */
  contenuto(dati: D, opzioni: { giorno: string; urlSito: string }): ContenutoSocial;
  /** JSX della card 1080×1350 (4:5), renderizzato con next/og. */
  card(dati: D, opzioni: { giorno: string }): JSX.Element;
};
