// Turismo → Eventi, pagina dedicata (17/09/2026). Vedi il commento esteso
// sopra ingestEventi() in scripts/ingest-light.mjs per la fonte, il
// metodo di verifica (HTML reale fornito dall'utente, non WebFetch) e il
// motivo per cui l'architettura proposta da ChatGPT (pipeline separata,
// nuovo schema Supabase relazionale, arricchimento pagina-per-pagina) NON
// è stata adottata: qui si estende semplicemente lo scraper leggero
// esistente, mantenendo un solo snapshot Supabase "eventi:turismofvg".
//
// Tipi condivisi tra EventiPanel.tsx (homepage) ed EventiPage.tsx
// (pagina dedicata /eventi) — devono corrispondere esattamente alla
// forma scritta da ingestEventi() in scripts/ingest-light.mjs.

export type Evento = {
  titolo: string;
  luogo: string;
  giorno: string;
  mese: string;
  orario: string;
  categoria: string;
  immagine: string | null;
  link: string;
  dataIso: string;
};

export type EventiSnapshot = {
  oggi: Evento[];
  domani: Evento[];
  weekend: Evento[];
  prossimi: Evento[];
  finestra: { da: string; a: string };
  aggiornato_al: string;
};

export function formattaDataEvento(dataIso: string): string {
  // Ancora a mezzogiorno UTC per evitare sfasamenti di un giorno vicino
  // ai cambi d'ora — stesso pattern usato in ingestEventi().
  const d = new Date(`${dataIso}T12:00:00Z`);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

export function categorieUniche(eventi: Evento[]): string[] {
  const set = new Set<string>();
  for (const e of eventi) {
    if (e.categoria) set.add(e.categoria);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
}
