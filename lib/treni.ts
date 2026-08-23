// Dati treni in tempo reale nelle 4 stazioni capoluogo — vedi
// app/api/treni/[tipo]/[stazione]/route.ts per la logica di fetch verso
// ViaggiaTreno (Trenitalia/RFI, API non ufficiale) e la normalizzazione
// dei dati grezzi.
//
// Perché un proxy server-side e non un fetch diretto da qui verso
// ViaggiaTreno: prima versione di questo file chiamava l'API esterna
// direttamente dal browser (come lib/allerte.ts fa con le allerte). In
// produzione il modulo restava sempre in stato di errore ("dati treni
// non disponibili"), sia dopo aver corretto un primo bug HTTP/HTTPS sia
// dopo — segno che il vero blocco è CORS: ViaggiaTreno non manda header
// Access-Control-Allow-Origin, quindi il browser scarta la risposta a
// qualunque fetch cross-origin, anche quando la richiesta di rete va a
// buon fine (l'errore è generico e indistinguibile da altri fallimenti).
// Un fetch verso il nostro stesso dominio (questa funzione, sotto)
// seguito da un fetch server-to-server dentro la Route Handler non passa
// mai da una restrizione CORS del browser.
//
// Interrogato lato client con polling ogni 60s da TreniPanel — vedi lì.

import type { ProvinciaSlug } from "@/lib/province";

export const STAZIONE_TRENI_PER_PROVINCIA: Record<ProvinciaSlug, { codice: string; nome: string }> = {
  trieste: { codice: "S03317", nome: "Trieste Centrale" },
  udine: { codice: "S03026", nome: "Udine" },
  gorizia: { codice: "S03304", nome: "Gorizia Centrale" },
  pordenone: { codice: "S02701", nome: "Pordenone" },
};

export type Treno = {
  numeroTreno: number;
  categoria: string;
  luogo: string | null; // destinazione per le partenze, origine per gli arrivi
  orarioTesto: string | null; // HH:MM già formattato dall'API
  ritardoMin: number | null;
  binario: string | null;
  // "modificato" = treno deviato/parzialmente cancellato/riprogrammato,
  // distinto da "cancellato" (soppressione totale) — vedi la Route
  // Handler per come vengono distinti (campo "provvedimento" di
  // ViaggiaTreno, non "circolante": quel campo indica solo se il treno è
  // già partito, non se è cancellato — bug corretto in questa sessione).
  stato: "cancellato" | "modificato" | "non-partito" | "ritardo" | "anticipo" | "orario";
  statoTesto: string;
};

async function fetchTreni(tipo: "partenze" | "arrivi", codiceStazione: string): Promise<Treno[]> {
  const res = await fetch(`/api/treni/${tipo}/${codiceStazione}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const dati = await res.json();
  if (!Array.isArray(dati)) return [];
  return dati as Treno[];
}

export function fetchPartenze(codiceStazione: string): Promise<Treno[]> {
  return fetchTreni("partenze", codiceStazione);
}

export function fetchArrivi(codiceStazione: string): Promise<Treno[]> {
  return fetchTreni("arrivi", codiceStazione);
}
