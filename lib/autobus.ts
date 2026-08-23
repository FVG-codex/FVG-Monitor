// Modulo autobus TPL FVG — passaggi (arrivi e partenze insieme, a
// differenza dei treni) in tempo reale per una fermata. Vedi
// app/api/autobus/[stopCode]/route.ts per la logica di fetch/
// normalizzazione e per i dettagli sull'endpoint reale, scoperto
// dall'utente ispezionando la scheda Rete del proprio browser (questa
// sessione non ha accesso a un browser reale).
//
// Proxy server-side fin dall'inizio, non fetch diretto dal browser come
// la prima versione di lib/treni.ts: stessa lezione già imparata coi
// treni (mixed content + CORS), qui applicata subito invece di scoprirla
// con un altro giro di bug in produzione.
//
// Interrogato lato client con polling ogni 60s da AutobusPanel — vedi lì.

export type FermataAutobus = { slug: string; stopCode: string; nome: string };

// Elenco fermate: si parte con Trieste (l'autostazione più vicina a
// Trieste Centrale, unica verificata finora con dati reali) — stesso
// pattern di crescita incrementale già usato per le stazioni treni
// (STAZIONI_TRENI in lib/treni.ts). L'utente aggiungerà le altre fermate
// via via, cercandole su https://tplfvg.it/it/orari/mappa/ e mandando il
// codice dal link "Realtime" (?stopcode=...).
export const FERMATE_AUTOBUS: FermataAutobus[] = [
  { slug: "trieste-autostazione", stopCode: "TS608", nome: "Trieste — Piazza della Libertà (autostazione)" },
];

export type PassaggioAutobus = {
  linea: string; // es. "G21A" (codice linea + verso, così come lo mostra TPL FVG)
  tipo: "arrivo" | "partenza";
  luogo: string | null; // provenienza per un arrivo, destinazione per una partenza
  orario: string | null; // HH:MM già formattato dall'API
  corsa: string | null; // numero di corsa
  binario: string | null; // binario/pensilina, se assegnato
  inTempoReale: boolean; // true se il bus è già tracciato via GPS (non solo orario programmato)
};

export async function fetchPassaggiFermata(stopCode: string): Promise<PassaggioAutobus[]> {
  const res = await fetch(`/api/autobus/${stopCode}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const dati = await res.json();
  if (!Array.isArray(dati)) return [];
  return dati as PassaggioAutobus[];
}
