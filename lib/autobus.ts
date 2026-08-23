// Modulo autobus TPL FVG — passaggi (arrivi e partenze insieme, a
// differenza dei treni) in tempo reale, raggruppati per BLOCCO (non più
// una fermata alla volta, vedi sotto). Endpoint scoperto dall'utente
// ispezionando la scheda Rete del proprio browser (questa sessione non
// ha mai raggiunto realtime.tplfvg.it, nemmeno per il suo robots.txt —
// vedi nota "Autobus" nel README per la cronologia completa).
//
// ECCEZIONE al pattern standard "sempre proxy server-side" (usato per
// Ferrovie): qui il fetch avviene DIRETTAMENTE dal browser di chi visita
// il sito, non da una nostra Route Handler. Motivo, verificato con dati
// reali dopo due fix falliti lato server (intestazioni "da browser", poi
// regione Vercel spostata da USA a Francoforte — nessuno dei due ha
// funzionato): ogni tentativo dal server Vercel falliva con un
// ConnectTimeoutError, identico da entrambe le regioni — non un blocco
// geografico, quindi. Un fetch dalla console del browser dell'utente (IP
// residenziale vero, non un IP di datacenter/cloud) ha invece funzionato
// subito, dati reali ricevuti, nessun errore CORS. Conclusione più
// probabile: l'API scarta le richieste provenienti da IP di
// datacenter/cloud (pratica comune nelle protezioni anti-scraping,
// indipendente dal continente).
//
// BLOCCHI: TPL FVG usa più codici fermata distinti per pensiline/binari
// diversi che sono fisicamente lo stesso posto (es. l'area della
// Stazione Ferroviaria di Trieste ha 9 codici diversi). L'utente ha
// chiesto di unire più fermate vicine in un'unica vista "a blocco" — un
// blocco fa una richiesta per ciascuna fermata che contiene e mostra i
// passaggi tutti insieme, ordinati per orario reale, con l'indicazione
// di quale fermata fisica appartiene ciascun passaggio (utile perché più
// fermate di un blocco possono avere lo stesso indirizzo pubblicato).
//
// Interrogato con polling ogni 60s da AutobusPanel — vedi lì.

const API_BASE = "https://realtime.tplfvg.it/API/v1.0/polemonitor";

export type FermataAutobus = { stopCode: string; nome: string };
export type BloccoAutobus = { slug: string; nome: string; fermate: FermataAutobus[] };

// Blocchi: si parte con Trieste, 11 fermate intorno alla Stazione
// Ferroviaria/Piazza della Libertà (autostazione) — indirizzi e
// coordinate verificati dall'utente con una chiamata reale a
// info?StopCode=... per ciascuna (23/08/2026). La maggior parte
// condivide l'indirizzo "STAZIONE FERROVIARIA" (pensiline/binari diversi
// nello stesso piazzale) — da qui il bisogno del blocco unico invece di
// tab separate, altrimenti sarebbero 11 tab quasi indistinguibili.
// 32206 non ha un indirizzo pubblicato dall'API (campo vuoto) ma le sue
// coordinate (45.6566, 13.7731) sono a poche decine di metri dalle
// altre, quindi resta nello stesso blocco — mostrato con il solo codice
// in mancanza di un nome. Le altre province verranno aggiunte come
// blocchi successivi, su richiesta esplicita dell'utente.
export const BLOCCHI_AUTOBUS: BloccoAutobus[] = [
  {
    slug: "trieste",
    nome: "Trieste",
    fermate: [
      { stopCode: "04007", nome: "Stazione Ferroviaria" },
      { stopCode: "04011", nome: "Stazione Ferroviaria" },
      { stopCode: "04022", nome: "Stazione Ferroviaria" },
      { stopCode: "32206", nome: "" }, // indirizzo non pubblicato dall'API, vedi nota sopra
      { stopCode: "04016", nome: "Stazione Ferroviaria" },
      { stopCode: "04018", nome: "Stazione Ferroviaria" },
      { stopCode: "04019", nome: "Stazione Ferroviaria" },
      { stopCode: "04023", nome: "Stazione Ferroviaria (varco Porto Vecchio)" },
      { stopCode: "TS608", nome: "Piazza della Libertà (autostazione)" },
      { stopCode: "04015", nome: "Stazione Ferroviaria" },
      { stopCode: "04014", nome: "Stazione Ferroviaria" },
    ],
  },
];

export type PassaggioAutobus = {
  linea: string; // es. "G21A" (codice linea + verso, così come lo mostra TPL FVG)
  tipo: "arrivo" | "partenza";
  luogo: string | null; // provenienza per un arrivo, destinazione per una partenza
  orario: string | null; // HH:MM già formattato dall'API
  oraIso: string | null; // timestamp ISO completo (campo Time), usato solo per ordinare cronologicamente i passaggi di più fermate unite in un blocco
  corsa: string | null; // numero di corsa
  binario: string | null; // binario/pensilina, se assegnato
  inTempoReale: boolean; // true se il bus è già tracciato via GPS (non solo orario programmato)
  fermataNome: string; // nome/indirizzo della fermata fisica di origine — utile perché più fermate di un blocco possono condividere lo stesso indirizzo
  fermataCodice: string; // codice fermata di origine, per distinguere fermate con lo stesso nome (es. più pensiline alla Stazione Ferroviaria)
};

// Forma grezza della risposta di TPL FVG — spostata qui da route.ts
// insieme alla normalizzazione, ora che il fetch avviene lato client
// (vedi nota architetturale sopra).
type RigaGrezza = {
  Line: string | null;
  Time: string | null; // timestamp ISO completo (es. "2026-08-23T14:45:00") — più preciso di ArrivalTime per ordinare
  ArrivalTime: string | null;
  Race: string | null;
  Destination: string | null;
  Departure: string | null;
  Platform: string | null;
  IsStarted: boolean | null;
  TransitType: string | null;
};

function normalizzaRiga(r: RigaGrezza, fermata: FermataAutobus): PassaggioAutobus {
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
    oraIso: r.Time || null,
    corsa: r.Race || null,
    binario: r.Platform || null,
    inTempoReale: r.IsStarted === true,
    fermataNome: fermata.nome,
    fermataCodice: fermata.stopCode,
  };
}

export async function fetchPassaggiBlocco(blocco: BloccoAutobus): Promise<PassaggioAutobus[]> {
  // Una richiesta per ciascuna fermata del blocco, in parallelo.
  // allSettled invece di Promise.all: se una singola fermata del blocco
  // ha un problema momentaneo non deve far sparire i dati delle altre 10
  // — mostriamo comunque il meglio possibile, ed entriamo in stato di
  // errore solo se davvero nessuna fermata ha risposto.
  const risultati = await Promise.allSettled(
    blocco.fermate.map(async (fermata) => {
      // IsUrban=true: unico valore verificato con una richiesta reale del
      // sito ufficiale — vedi nota "IsUrban" nel README, il parametro non
      // sembra filtrare per la classificazione reale della fermata.
      const url = `${API_BASE}/mrcruns?StopCode=${encodeURIComponent(fermata.stopCode)}&IsUrban=true`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const righe = await res.json();
      if (!Array.isArray(righe)) return [];
      return (righe as RigaGrezza[]).map((r) => normalizzaRiga(r, fermata));
    })
  );

  const riusciti = risultati.filter(
    (r): r is PromiseFulfilledResult<PassaggioAutobus[]> => r.status === "fulfilled"
  );

  if (riusciti.length === 0) {
    // Nessuna fermata del blocco ha risposto: propaghiamo l'errore della
    // prima fermata fallita invece di un errore generico, per lasciare
    // un indizio diagnostico a chi guarda la console.
    const primoErrore = risultati.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw primoErrore ? primoErrore.reason : new Error("nessuna fermata del blocco ha risposto");
  }

  const passaggi = riusciti.flatMap((r) => r.value);
  // Ordine cronologico per orario di transito effettivo (non per
  // fermata) — è quello che serve quando si uniscono più fermate in un
  // unico blocco: "il prossimo bus", non un elenco fermata per fermata.
  passaggi.sort((a, b) => (a.oraIso ?? "").localeCompare(b.oraIso ?? ""));
  return passaggi;
}
