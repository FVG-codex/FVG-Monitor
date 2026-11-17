// Aggiornamento giornaliero del prezzo medio regionale dei carburanti
// (MIMIT) — spostato qui da scripts/ingest-light.mjs (GitHub Actions)
// il 24/11/2026, stesso schema già usato per
// app/api/cron/rifiuti-acegas/route.ts (19/09/2026): vedi il commento
// sopra ingestCarburanti() in quello script e
// claude/fvgmonitor-stato.md (sezione dedicata, stessa data) per
// l'indagine completa.
//
// **Il problema che questo file risolve**: l'utente ha segnalato il
// prezzo fermo al 16/10/2026; il log della relativa esecuzione
// GitHub Actions mostra `ConnectTimeoutError` (10s) verso
// www.mimit.gov.it:443 — non un errore HTTP, la connessione TCP/TLS
// non si stabilisce affatto. Lo stesso identico URL, scaricato
// dall'utente dal proprio browser lo stesso giorno, risponde
// normalmente con dati aggiornati a quel giorno stesso — la fonte è
// quindi a posto, il blocco è sulla rete di GitHub Actions (stesso
// pattern già noto per Acegas/TPL FVG: un sito istituzionale italiano
// che filtra per IP/ASN datacenter-cloud, qui manifestato come
// connessione lasciata cadere invece di un 403 esplicito — coerente
// con un blocco a livello di firewall di rete piuttosto che
// applicativo). Questa route esiste per scoprire se l'infrastruttura
// Vercel ne è esente (non garantito, stesso avvertimento già scritto
// per rifiuti-acegas/route.ts).
//
// **Formato CSV e logica di estrazione**: identici a quanto già
// documentato nel commento esteso sopra ingestCarburanti() in
// scripts/ingest-light.mjs — non ripetuti qui, quel commento resta la
// fonte di riferimento per come è stato verificato il formato.
//
// **Innescata da un Vercel Cron Job** (vedi vercel.json, orario scelto
// per cadere dopo le 8:00 italiane di pubblicazione del file in
// entrambi i fusi orari stagionali — v. commento lì), con lo stesso
// controllo `Authorization: Bearer <CRON_SECRET>` e le stesse
// variabili d'ambiente (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) già
// richieste da rifiuti-acegas/route.ts — se sono già state impostate
// su Vercel per quello, bastano quelle, nessuna variabile nuova.
//
// **Nessun read-modify-write qui**: a differenza dello snapshot
// condiviso "rifiuti" (più gestori nella stessa riga), "carburanti" è
// una riga a sé stante con un solo scrittore — un upsert diretto basta.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CARBURANTI_CSV_URL = "https://www.mimit.gov.it/images/stories/carburanti/MediaRegionaleStradale.csv";
const REGIONE_CARBURANTI = "Friuli Venezia Giulia";

const CARBURANTI_TIPI = [
  { chiave: "benzina", tipologia: "Benzina", erogazione: "SELF" },
  { chiave: "gasolio", tipologia: "Gasolio", erogazione: "SELF" },
  { chiave: "gpl", tipologia: "GPL", erogazione: "SERVITO" },
] as const;

type PrezzoCarburante = { prezzo_medio_eur_litro: number; erogazione: "self" | "servito" };
type CarburantiData = {
  carburanti: Partial<Record<"benzina" | "gasolio" | "gpl", PrezzoCarburante>>;
  aggiornato_al: string | null;
};

async function fetchPrezziCarburanti(): Promise<CarburantiData> {
  // User-Agent da browser vero: non risolve un blocco a livello di rete
  // (quello si risolve solo cambiando infrastruttura, cioè girando da
  // Vercel invece che da GitHub Actions), ma non costa nulla aggiungerlo
  // per escludere anche un blocco applicativo più banale sulla sola
  // assenza di User-Agent — stesso principio difensivo già usato in
  // rifiuti-acegas/route.ts.
  const res = await fetch(CARBURANTI_CSV_URL, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/csv,text/plain,*/*",
    },
  });
  if (!res.ok) {
    throw new Error(`CSV MIMIT non disponibile (HTTP ${res.status})`);
  }

  const testo = await res.text();
  const righe = testo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  if (righe.length < 2) {
    throw new Error("CSV prezzi carburanti vuoto o troppo corto");
  }

  const matchData = righe[0].match(/(\d{2})-(\d{2})-(\d{4})/);
  const aggiornatoAl = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : null;

  const righeDati = righe.slice(2).map((r) => r.split(";")); // salta "Aggiornamento ..." e l'intestazione

  const carburanti: CarburantiData["carburanti"] = {};
  for (const t of CARBURANTI_TIPI) {
    const riga = righeDati.find(
      ([regione, tipologia, erogazione]) =>
        regione === REGIONE_CARBURANTI && tipologia === t.tipologia && erogazione === t.erogazione
    );
    if (!riga) {
      console.warn(`Riga ${t.tipologia} non trovata per "${REGIONE_CARBURANTI}" nel CSV MIMIT`);
      continue;
    }
    const prezzo = Number(riga[3]);
    if (!Number.isFinite(prezzo)) {
      console.warn(`Prezzo ${t.tipologia} non numerico nel CSV MIMIT: "${riga[3]}"`);
      continue;
    }
    carburanti[t.chiave] = {
      prezzo_medio_eur_litro: Math.round(prezzo * 1000) / 1000,
      erogazione: t.erogazione === "SELF" ? "self" : "servito",
    };
  }

  if (Object.keys(carburanti).length === 0) {
    throw new Error("nessun prezzo carburante trovato nel CSV MIMIT");
  }

  return { carburanti, aggiornato_al: aggiornatoAl };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: "mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  let dati: CarburantiData;
  try {
    dati = await fetchPrezziCarburanti();
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    console.error(`Carburanti (MIMIT): errore, snapshot non toccato: ${messaggio}`);
    // Niente fallback "stale" qui: a differenza di Rifiuti/Acegas questo
    // snapshot non ha un campo del genere (v. CarburantiPanel.tsx) — in
    // caso di errore si lascia semplicemente l'ultimo dato buono così
    // com'è, stesso comportamento che aveva già ingestCarburanti() in
    // scripts/ingest-light.mjs su un HTTP non-ok.
    return NextResponse.json({ error: messaggio }, { status: 502 });
  }

  const { error: erroreScrittura } = await supabase.from("snapshots").upsert({
    id: "carburanti",
    module: "carburanti",
    zone: null,
    data: dati,
    updated_at: new Date().toISOString(),
  });
  if (erroreScrittura) {
    return NextResponse.json({ error: `scrittura snapshot fallita: ${erroreScrittura.message}` }, { status: 500 });
  }

  console.log(
    `Carburanti (MIMIT): aggiornati ${Object.keys(dati.carburanti).length} prezzi, aggiornato_al=${dati.aggiornato_al}`
  );
  return NextResponse.json({ ok: true, aggiornato_al: dati.aggiornato_al });
}
