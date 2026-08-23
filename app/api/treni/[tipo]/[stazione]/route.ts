// Proxy server-side per i dati treni di ViaggiaTreno — vedi lib/treni.ts
// per il contesto sul modulo lato client (TreniPanel, polling ogni 60s).
//
// Perché un proxy e non un fetch diretto dal browser (come per allerte.ts):
// il fix HTTP→HTTPS di lib/treni.ts NON ha risolto il bug riportato in
// produzione ("modulo presente ma dati mai raccolti", confermato con
// screenshot dopo il fix). Causa più probabile: l'endpoint ViaggiaTreno
// non manda header CORS (Access-Control-Allow-Origin) — è pensato per
// essere chiamato dal proprio sito/app, non da domini terzi. Il browser
// blocca quindi la risposta a un fetch cross-origin anche quando la
// richiesta di rete va a buon fine, con un errore generico ("Failed to
// fetch") indistinguibile lato nostro codice da qualunque altro
// fallimento — stesso identico sintomo del bug precedente.
//
// Un fetch server-to-server (qui, dentro un Route Handler Next.js) non è
// soggetto a CORS: quella restrizione esiste solo per le richieste fatte
// da un browser. Il browser dell'utente chiama questa route sul nostro
// stesso dominio (nessun CORS, siamo same-origin), e questa route
// interroga ViaggiaTreno lato server.
//
// Nessuna cache HTTP: il dato deve restare quasi in tempo reale.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = "https://www.viaggiatreno.it/infomobilitamobile/resteasy/viaggiatreno";

// Accetta solo codici stazione nella forma nota (es. "S03317"), per non
// trasformare questa route in un proxy aperto verso qualunque URL.
const CODICE_STAZIONE_VALIDO = /^S\d{5}$/;

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

// Stessa forma di Treno in lib/treni.ts — duplicata qui perché quel file
// resta lato client (usa fetch relativo, deve poter girare nel browser)
// mentre questo è codice server-only. Se cambia una delle due, allineare
// anche l'altra.
type Treno = {
  numeroTreno: number;
  categoria: string;
  luogo: string | null;
  orarioTesto: string | null;
  ritardoMin: number | null;
  binario: string | null;
  stato: "cancellato" | "non-partito" | "ritardo" | "anticipo" | "orario";
  statoTesto: string;
};

// Formato richiesto dall'API per {orario}, es. "Sat Aug 22 2026 22:18:00
// GMT+0200". Calcolato esplicitamente nel fuso orario Europe/Rome (mai
// con Date.prototype.getHours()/getTimezoneOffset(), che userebbero il
// fuso orario del PROCESSO): le funzioni serverless su Vercel girano in
// UTC, quindi leggere l'ora "locale" del server produrrebbe un orario
// sbagliato di 1-2 ore rispetto all'Italia (a seconda di CET/CEST).
function formattaOrarioRichiesta(d: Date): string {
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (tipo: string) => parti.find((p) => p.type === tipo)?.value ?? "00";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

  // Offset di Roma rispetto a UTC in questo istante (gestisce CET/CEST
  // automaticamente): differenza tra l'ora locale romana letta come se
  // fosse UTC e l'istante UTC reale corrispondente.
  const comeUTC = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMin = Math.round((comeUTC - d.getTime()) / 60000);
  const segno = offsetMin >= 0 ? "+" : "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offsetM = pad(Math.abs(offsetMin) % 60);

  const GIORNI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MESI = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekday = new Date(comeUTC).getUTCDay(); // giorno della settimana coerente con la data romana

  return (
    `${GIORNI[weekday]} ${MESI[month - 1]} ${pad(day)} ${year} ` +
    `${pad(hour)}:${pad(minute)}:${pad(second)} GMT${segno}${offsetH}${offsetM}`
  );
}

function normalizzaRiga(r: RigaGrezza, tipo: "partenze" | "arrivi"): Treno {
  const binario =
    tipo === "partenze"
      ? r.binarioEffettivoPartenzaDescrizione || r.binarioProgrammatoPartenzaDescrizione
      : r.binarioEffettivoArrivoDescrizione || r.binarioProgrammatoArrivoDescrizione;

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

export async function GET(_req: Request, { params }: { params: { tipo: string; stazione: string } }) {
  const { tipo, stazione } = params;

  if (tipo !== "partenze" && tipo !== "arrivi") {
    return NextResponse.json({ error: "tipo non valido" }, { status: 400 });
  }
  if (!CODICE_STAZIONE_VALIDO.test(stazione)) {
    return NextResponse.json({ error: "codice stazione non valido" }, { status: 400 });
  }

  const orario = formattaOrarioRichiesta(new Date());
  const url = `${API_BASE}/${tipo}/${stazione}/${encodeURIComponent(orario)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `ViaggiaTreno HTTP ${res.status}` }, { status: 502 });
    }
    const righe: RigaGrezza[] = await res.json();
    if (!Array.isArray(righe)) {
      return NextResponse.json([]);
    }
    return NextResponse.json(righe.map((r) => normalizzaRiga(r, tipo)));
  } catch {
    return NextResponse.json({ error: "fetch a ViaggiaTreno fallito" }, { status: 502 });
  }
}
