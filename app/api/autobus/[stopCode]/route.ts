// Proxy server-side per i passaggi autobus di TPL FVG — vedi lib/autobus.ts
// per il contesto sul modulo lato client (AutobusPanel, polling ogni 60s).
//
// Endpoint scoperto dall'utente ispezionando la scheda Rete del proprio
// browser mentre usava https://tplfvg.it/it/orari/mappa/ (questa sessione
// non ha accesso a un browser reale — vedi nota "Autobus" nel README per
// la cronologia completa della ricerca). Non documentato pubblicamente,
// stessa cautela già usata per ViaggiaTreno.
//
// Proxy server-side FIN DA SUBITO (a differenza della prima versione di
// lib/treni.ts, che partiva con un fetch diretto dal browser e ha dovuto
// scoprire a sue spese mixed-content + CORS in due bug separati): qui
// applichiamo subito la lezione imparata, senza aspettare un altro giro
// di segnalazioni in produzione. Un fetch server-to-server non è mai
// soggetto a CORS ed è insensibile allo schema http/https della pagina.
//
// Nessuna cache HTTP: il dato deve restare quasi in tempo reale.
//
// Bug segnalato dall'utente subito dopo la prima consegna: il pannello
// resta sempre su "Dati autobus non disponibili", identico sintomo dei
// bug 1/2 del modulo Ferrovie.
//
// Tentativo 1 (intestazioni "da browser vero" — User-Agent/Accept/
// Referer, ancora sotto): confermato dall'utente che NON risolve.
//
// Tentativo 2 (questo): il campo `dettaglio` restituito dalla route ha
// mostrato "TypeError: fetch failed" — l'errore generico che Node/undici
// dà per un fallimento di rete a basso livello (connessione/DNS/TLS),
// non un vero errore HTTP applicativo (che sarebbe arrivato comunque con
// uno status code, anche un 403). Combinato col fatto che questa sessione
// non riesce a raggiungere realtime.tplfvg.it in NESSUN modo (nemmeno il
// suo robots.txt, con lo stesso tipo di timeout), l'ipotesi più probabile
// ora è un blocco a livello di rete/IP verso richieste da fuori
// Italia/UE, non un controllo sulle intestazioni. Le funzioni serverless
// di Vercel girano di default a Washington D.C. (USA) se non si
// specifica una regione — vedi vercel.json, aggiunto in questo stesso
// giro per spostare le funzioni a Francoforte (fra1, EU), disponibile
// anche sul piano gratuito Hobby (un solo valore consentito, non
// multi-regione). Se anche questo non bastasse, il campo `dettaglio` ora
// include anche `err.cause` quando presente, per avere più informazioni
// al prossimo giro invece di indovinare una quarta volta.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = "https://realtime.tplfvg.it/API/v1.0/polemonitor";

// Codice fermata TPL FVG osservato: 2 lettere provincia + numero (es.
// "TS608", verificato con dati reali). Non conosciamo il range esatto di
// cifre per ogni provincia, quindi il pattern è volutamente permissivo —
// serve solo a evitare che questa route diventi un proxy aperto verso
// URL arbitrari, non a validare un formato ufficiale documentato.
const CODICE_FERMATA_VALIDO = /^[A-Z]{2}\d{2,6}$/;

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

// Stessa forma di PassaggioAutobus in lib/autobus.ts — duplicata qui
// perché quel file resta lato client mentre questo è codice server-only.
// Se cambia una delle due, allineare anche l'altra.
type PassaggioAutobus = {
  linea: string;
  tipo: "arrivo" | "partenza";
  luogo: string | null;
  orario: string | null;
  corsa: string | null;
  binario: string | null;
  inTempoReale: boolean;
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

export async function GET(_req: Request, { params }: { params: { stopCode: string } }) {
  const stopCode = params.stopCode?.toUpperCase();

  if (!stopCode || !CODICE_FERMATA_VALIDO.test(stopCode)) {
    return NextResponse.json({ error: "codice fermata non valido" }, { status: 400 });
  }

  // IsUrban=true: unico valore verificato con una richiesta reale del
  // sito ufficiale. La fermata di verifica (TS608, "TRIESTE piazza della
  // Libertà (autostazione)") è in realtà classificata IsUrban:false /
  // IsExtraUrban:true dall'endpoint /info — eppure il sito stesso chiama
  // /mrcruns con IsUrban=true e riceve corse extraurbane regolarmente
  // (Grado, Aeroporto). Il parametro quindi non sembra filtrare i
  // risultati in base alla classificazione della fermata; per ora lo
  // teniamo costante a true finché un caso reale non smentisce questa
  // osservazione.
  const url = `${API_BASE}/mrcruns?StopCode=${encodeURIComponent(stopCode)}&IsUrban=true`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        // Intestazioni "da browser vero" — tentativo più probabile per il
        // bug "dati mai disponibili" segnalato dall'utente, vedi nota sopra.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://realtime.tplfvg.it/",
      },
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      return NextResponse.json({ error: `TPL FVG HTTP ${res.status}`, dettaglio: corpo.slice(0, 500) }, { status: 502 });
    }
    const righe: RigaGrezza[] = await res.json();
    if (!Array.isArray(righe)) {
      return NextResponse.json([]);
    }
    return NextResponse.json(righe.map(normalizzaRiga));
  } catch (err) {
    // Dettaglio incluso apposta nella risposta (non mostrato
    // nell'interfaccia, ma visibile visitando questo URL direttamente nel
    // browser) — se anche questo fix non bastasse, il messaggio qui sotto
    // dice subito SE è di nuovo un problema di rete/timeout oppure altro,
    // senza dover indovinare una seconda volta. Include anche `cause`
    // quando presente: un TypeError "fetch failed" di Node/undici lo
    // porta quasi sempre con l'errore di rete vero (es. ECONNREFUSED,
    // ETIMEDOUT, un problema TLS) — informazione persa se si guarda solo
    // `message`.
    const causa = err instanceof Error && err.cause ? ` | cause: ${String(err.cause)}` : "";
    const dettaglio = (err instanceof Error ? `${err.name}: ${err.message}` : String(err)) + causa;
    return NextResponse.json({ error: "fetch a TPL FVG fallito", dettaglio }, { status: 502 });
  }
}
