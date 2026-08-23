// Modulo autobus TPL FVG — passaggi (arrivi e partenze insieme, a
// differenza dei treni) in tempo reale per una fermata. Endpoint
// scoperto dall'utente ispezionando la scheda Rete del proprio browser
// (questa sessione non ha mai raggiunto realtime.tplfvg.it, nemmeno per
// il suo robots.txt — vedi nota "Autobus" nel README per la cronologia
// completa).
//
// ECCEZIONE al pattern standard "sempre proxy server-side" (usato per
// Ferrovie e per la prima versione di questo stesso modulo): qui il
// fetch avviene DIRETTAMENTE dal browser di chi visita il sito, non da
// una nostra Route Handler. Motivo, verificato con dati reali dopo due
// fix falliti lato server (intestazioni "da browser", poi regione Vercel
// spostata da USA a Francoforte — nessuno dei due ha funzionato): ogni
// tentativo dal server Vercel falliva con un ConnectTimeoutError,
// identico da entrambe le regioni — non un blocco geografico, quindi.
// Un fetch dalla console del browser dell'utente (IP residenziale vero,
// non un IP di datacenter/cloud) ha invece funzionato subito, dati reali
// ricevuti, nessun errore CORS. Conclusione più probabile: l'API scarta
// le richieste provenienti da IP di datacenter/cloud (pratica comune
// nelle protezioni anti-scraping, indipendente dal continente) — un
// proxy server-side su QUALSIASI piattaforma cloud incontrerebbe lo
// stesso blocco. Il fetch lato client bypassa il problema alla radice
// (l'IP è quello del visitatore, non di un server) e in più risparmia un
// giro di rete. app/api/autobus/[stopCode]/route.ts è stata rimossa
// perché ormai morta: restava sempre in errore per il motivo sopra.
//
// Interrogato con polling ogni 60s da AutobusPanel — vedi lì.

const API_BASE = "https://realtime.tplfvg.it/API/v1.0/polemonitor";

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

// Forma grezza della risposta di TPL FVG — spostata qui da route.ts
// insieme alla normalizzazione, ora che il fetch avviene lato client
// (vedi nota architetturale sopra).
type RigaGrezza = {
  Line: string | null;
  ArrivalTime: string | null;
  Race: string | null;
  Destination: string | null;
  Departure: string | null;
  Platform: string | null;
  IsStarted: boolean | null;
  TransitType: string | null;
};

function normalizzaRiga(r: RigaGrezza): PassaggioAutobus {
  // TransitType è il campo ufficiale che distingue arrivo/partenza in
  // un'unica risposta (a differenza dei treni, che hanno endpoint
  // separati partenze/arrivi) — qualunque valore diverso da
  // "DepartureFromStop" viene trattato come arrivo, di default prudente.
  const tipo: PassaggioAutobus["tipo"] = r.TransitType === "DepartureFromStop" ? "partenza" : "arrivo";

  return {
    linea: r.Line ?? "",
    tipo,
    // Per una partenza mostriamo dove va (Destination), per un arrivo da
    // dove viene (Departure) — stessi nomi di campo usati dall'API.
    luogo: (tipo === "partenza" ? r.Destination : r.Departure) || null,
    orario: r.ArrivalTime || null,
    corsa: r.Race || null,
    binario: r.Platform || null,
    inTempoReale: r.IsStarted === true,
  };
}

export async function fetchPassaggiFermata(stopCode: string): Promise<PassaggioAutobus[]> {
  // IsUrban=true: unico valore verificato con una richiesta reale del
  // sito ufficiale — vedi nota "IsUrban" nel README, il parametro non
  // sembra filtrare per la classificazione reale della fermata.
  const url = `${API_BASE}/mrcruns?StopCode=${encodeURIComponent(stopCode)}&IsUrban=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const righe = await res.json();
  if (!Array.isArray(righe)) return [];
  return (righe as RigaGrezza[]).map(normalizzaRiga);
}
