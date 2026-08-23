// Dati treni in tempo reale — API non ufficiale/non documentata
// pubblicamente di ViaggiaTreno (Trenitalia/RFI), stessa cautela già
// usata per InfoViaggiando e ANSA in questo progetto.
//
// Il sito ha avuto un redesign (SPA) nel 2026: il vecchio percorso
// "viaggiatrenonew/resteasy/..." citato in guide di terze parti (spesso
// datate 2015-2020) non funziona più — reindirizza a un annuncio "nuovo
// sito disponibile qui". Il percorso usato qui è stato verificato
// manualmente con chiamate reali nell'agosto 2026.
//
// Fetch LATO CLIENT (come le allerte in lib/allerte.ts), non dentro
// scripts/ingest-light.mjs: un tabellone partenze/arrivi ha senso solo
// se quasi in tempo reale — l'ingestione ogni 15 minuti degli altri
// moduli produrrebbe uno snapshot spesso già superato.
//
// IMPORTANTE: base HTTPS, non HTTP. Prima versione di questo file usava
// http:// (funzionava nei test da questa sessione, che non passano da un
// browser reale) — in produzione, con il sito servito in HTTPS (Vercel
// forza HTTPS), il browser blocca silenziosamente le richieste "mixed
// content" verso un endpoint http:// da una pagina https:// (nessun
// errore visibile lato utente, solo un fetch che fallisce sempre — esatto
// sintomo riportato: modulo presente ma dati mai raccolti). Verificato
// che l'endpoint supporta HTTPS senza redirect né errori di certificato.

import type { ProvinciaSlug } from "@/lib/province";

const API_BASE = "https://www.viaggiatreno.it/infomobilitamobile/resteasy/viaggiatreno";

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
  stato: "cancellato" | "non-partito" | "ritardo" | "anticipo" | "orario";
  statoTesto: string;
};

// Formato richiesto dall'API per il parametro {orario}, stile
// Date.prototype.toString() di JavaScript ma SENZA il nome del fuso
// orario tra parentesi (es. "Sat Aug 22 2026 22:18:00 GMT+0200") — quello
// con parentesi non è stato verificato, questo sì.
function formattaOrarioRichiesta(d: Date): string {
  const GIORNI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MESI = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMin = -d.getTimezoneOffset();
  const segno = offsetMin >= 0 ? "+" : "-";
  const offsetH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offsetM = pad(Math.abs(offsetMin) % 60);
  return (
    `${GIORNI[d.getDay()]} ${MESI[d.getMonth()]} ${pad(d.getDate())} ${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} GMT${segno}${offsetH}${offsetM}`
  );
}

// Campi JSON grezzi verificati manualmente (partenze e arrivi hanno la
// stessa forma, con le varianti Partenza/Arrivo dei nomi binario) — vedi
// nota "Ferrovie" nel README per il JSON completo di un esempio reale.
type RigaGrezza = {
  numeroTreno: number;
  categoria: string | null;
  origine: string | null;
  destinazione: string | null;
  compOrarioPartenza: string | null;
  compOrarioArrivo: string | null;
  binarioEffettivoPartenzaDescrizione: string | null;
  binarioProgrammatoPartenzaDescrizione: string | null;
  binarioEffettivoArrivoDescrizione: string | null;
  binarioProgrammatoArrivoDescrizione: string | null;
  ritardo: number | null;
  nonPartito: boolean | null;
  circolante: boolean | null;
};

function normalizzaRiga(r: RigaGrezza, tipo: "partenze" | "arrivi"): Treno {
  const binario =
    tipo === "partenze"
      ? r.binarioEffettivoPartenzaDescrizione || r.binarioProgrammatoPartenzaDescrizione
      : r.binarioEffettivoArrivoDescrizione || r.binarioProgrammatoArrivoDescrizione;

  // Il campo "ritardo" a volte usa valori sentinella molto grandi per
  // "non disponibile" in altre implementazioni della stessa famiglia di
  // API — per sicurezza, un ritardo fuori da un range plausibile viene
  // trattato come dato mancante invece di mostrare un numero assurdo
  const ritardoMin = typeof r.ritardo === "number" && Math.abs(r.ritardo) < 500 ? r.ritardo : null;

  let stato: Treno["stato"];
  let statoTesto: string;
  if (r.circolante === false) {
    stato = "cancellato";
    statoTesto = "Cancellato";
  } else if (r.nonPartito === true) {
    stato = "non-partito";
    statoTesto = "Non ancora partito";
  } else if (ritardoMin === null) {
    stato = "orario";
    statoTesto = "—";
  } else if (ritardoMin > 0) {
    stato = "ritardo";
    statoTesto = `Ritardo ${ritardoMin} min`;
  } else if (ritardoMin < 0) {
    stato = "anticipo";
    statoTesto = `Anticipo ${Math.abs(ritardoMin)} min`;
  } else {
    stato = "orario";
    statoTesto = "In orario";
  }

  return {
    numeroTreno: r.numeroTreno,
    categoria: r.categoria ?? "",
    luogo: (tipo === "partenze" ? r.destinazione : r.origine) || null,
    orarioTesto: (tipo === "partenze" ? r.compOrarioPartenza : r.compOrarioArrivo) || null,
    ritardoMin,
    binario: binario || null,
    stato,
    statoTesto,
  };
}

async function fetchTreni(tipo: "partenze" | "arrivi", codiceStazione: string): Promise<Treno[]> {
  const orario = formattaOrarioRichiesta(new Date());
  const url = `${API_BASE}/${tipo}/${codiceStazione}/${encodeURIComponent(orario)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const righe: RigaGrezza[] = await res.json();
  if (!Array.isArray(righe)) return [];
  return righe.map((r) => normalizzaRiga(r, tipo));
}

export function fetchPartenze(codiceStazione: string): Promise<Treno[]> {
  return fetchTreni("partenze", codiceStazione);
}

export function fetchArrivi(codiceStazione: string): Promise<Treno[]> {
  return fetchTreni("arrivi", codiceStazione);
}
