// Aggiornamento giornaliero delle stazioni ecologiche di Trieste
// (AcegasApsAmga / Il Rifiutologo) per lo snapshot condiviso "rifiuti"
// — spostato qui da scripts/ingest-light.mjs (GitHub Actions) il
// 19/09/2026, v. il commento sopra rifiutiIngestAcegas() in
// quello script e claude/fvgmonitor-stato.md (sezione dedicata,
// stessa data) per il perché.
//
// **Il problema che questo file risolve**: l'utente ha verificato con
// un curl reale che getListaStazioniEcologiche.php risponde 200 con
// dati veri da una rete normale ma 403 alla stessa identica richiesta
// da GitHub Actions — un blocco per IP datacenter/cloud (stesso
// pattern già noto per TPL FVG/autobus), non per header mancanti. Un
// secondo test con `Origin` randomizzato ha inoltre confermato che
// `Access-Control-Allow-Origin` nella risposta è un allow-list rigido
// sul solo `https://www.ilrifiutologo.it` (non riflette Origin
// arbitrarie) — quindi la soluzione "fetch diretto dal browser del
// visitatore", usata per gli autobus, non è applicabile qui: un fetch
// lato browser dal nostro dominio verrebbe bloccato dal browser stesso
// per CORS. Da notare che il CORS non c'entra nulla con QUESTA route:
// è un controllo imposto dal browser, non dal server, e qui a fare la
// richiesta è il server stesso (Vercel), non il browser di nessuno —
// il vero (unico) ostacolo resta il blocco per IP, e questa route
// esiste per scoprire se l'infrastruttura Vercel ne è esente
// (infrastruttura diversa da GitHub Actions, ma non è garantito che
// sfugga allo stesso tipo di blocco — v. sopra per i dettagli).
//
// **Endpoint e forma dei campi**: identici a quelli già documentati
// nel commento esteso sopra rifiutiIngestAcegas() in
// scripts/ingest-light.mjs (fonte: HTML/JS reale della pagina
// "Stazioni ecologiche" di Trieste, incollato dall'utente il
// 18/09/2026) — getListaStazioniEcologiche.php per l'elenco,
// getDettaglioStazione.php per orari/materiali/note di ciascuna
// stazione. Non ripetuto qui parola per parola: quel commento resta la
// fonte storica di come sono stati scoperti questi due endpoint.
//
// **Innescato da un Vercel Cron Job** (vedi vercel.json), non da
// GitHub Actions: Vercel invia automaticamente l'header
// `Authorization: Bearer <CRON_SECRET>` quando la variabile d'ambiente
// CRON_SECRET esiste nel progetto — controllato sotto per impedire che
// chiunque conosca l'URL possa forzare un'esecuzione. Richiede inoltre
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (le stesse due usate da
// scripts/ingest-light.mjs, NON le variabili NEXT_PUBLIC_* già presenti
// per le pagine — quelle sono la chiave anon, limitata dalla RLS, non
// autorizzata a scrivere) impostate come variabili d'ambiente del
// progetto Vercel, non solo nei secrets di GitHub Actions.
//
// **Ordine di esecuzione rispetto a scripts/ingest-light.mjs**:
// volutamente NON rilevante per la correttezza. Questa route fa un
// read-modify-write sullo snapshot "rifiuti" (legge l'array comuni
// esistente, sostituisce solo la riga "trieste", riscrive l'array
// intero) — e ingest-light.mjs, dal canto suo, si limita ormai a
// ripresentare invariata la riga "trieste" che trova già nello
// snapshot letto a inizio esecuzione. Qualunque sia l'ordine fra le
// due esecuzioni nello stesso giorno, il risultato finale converge
// comunque sui dati più freschi che questa route sia riuscita a
// scrivere: non serve sincronizzare gli orari dei due cron né
// preoccuparsi dell'ora legale/solare (differenza fra Vercel Cron, in
// UTC fisso, e la finestra 03:00 Europe/Rome di ingest-light.mjs).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // ampio margine: in pratica 1 lista + poche chiamate di dettaglio

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ComuneRifiuti, SnapshotRifiuti, StazioneEcologica } from "@/lib/rifiuti";

const ID_COMUNE_TRIESTE = 424;
const API_BASE = "https://webapp-ambiente.gruppohera.it/rifiutologo/rifiutologoweb";
const CONCORRENZA = 4;

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(s: string | null | undefined): string {
  return clean((s ?? "").replace(/<[^>]*>/g, " "));
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FVGMonitorBot/1.0)",
      Accept: "*/*",
      Referer: "https://www.ilrifiutologo.it/",
      Origin: "https://www.ilrifiutologo.it",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Stessa regola di scripts/ingest-light.mjs: tiene solo gli intervalli
// di apertura ancora validi oggi (senza dataFine, o con dataFine non
// ancora passata) invece di portarsi dietro l'intera storia.
function orariCorrenti(aperture: unknown, oggiIso: string) {
  if (!Array.isArray(aperture)) return [];
  return aperture
    .filter((a) => !a.dataFine || String(a.dataFine).slice(0, 10) >= oggiIso)
    .filter((a) => a.giorno && a.orarioInizio && a.orarioFine)
    .map((a) => ({
      giorno: Number(a.giorno),
      orarioInizio: String(a.orarioInizio),
      orarioFine: String(a.orarioFine),
    }))
    .sort((a, b) => a.giorno - b.giorno);
}

async function fetchDettaglioStazione(idStazione: number, oggiIso: string) {
  const url = new URL(`${API_BASE}/getDettaglioStazione.php`);
  url.searchParams.set("idComune", String(ID_COMUNE_TRIESTE));
  url.searchParams.set("idStazione", String(idStazione));
  url.searchParams.set("isBusiness", "0");
  const dettaglio = await fetchJson(url.toString());

  const materiali: string[] = Array.isArray(dettaglio.macroprodotti)
    ? dettaglio.macroprodotti.map((m: any) => stripHtml(m.descrizione)).filter(Boolean)
    : [];

  // Stessa unione descrizione + descrizioneServizi + note del sito
  // reale (v. commento gemello in scripts/ingest-light.mjs).
  const note = [dettaglio.descrizione, dettaglio.descrizioneServizi, dettaglio.note]
    .map((t) => stripHtml(t))
    .filter(Boolean)
    .join(" — ");

  return {
    orari: orariCorrenti(dettaglio.aperture, oggiIso),
    materiali,
    note: note || null,
  };
}

async function fetchStazione(staz: any, oggiIso: string): Promise<StazioneEcologica> {
  const base = {
    id: Number(staz.id),
    nome: clean(staz.nome),
    indirizzo: clean(staz.indirizzo) || null,
    comune: clean(staz.comune) || null,
    latitudine: staz.latitudine != null ? Number(staz.latitudine) : null,
    longitudine: staz.longitudine != null ? Number(staz.longitudine) : null,
  };
  try {
    return { ...base, ...(await fetchDettaglioStazione(staz.id, oggiIso)) };
  } catch (err) {
    // Meglio una stazione senza orari/materiali (la posizione resta
    // comunque utile) che ometterla del tutto per un errore sul solo
    // dettaglio — stessa scelta di scripts/ingest-light.mjs.
    console.warn(`Rifiuti (AcegasApsAmga): errore dettaglio stazione ${staz.id}: ${(err as Error).message}`);
    return { ...base, note: null, orari: [], materiali: [] };
  }
}

// Nessuna libreria esterna per limitare la concorrenza: elenco piccolo
// (5 centri di raccolta per Trieste, verificato con un curl reale il
// 19/09/2026), stesso principio/stessa forma di rifiutiConLimiteConcorrenza
// in scripts/ingest-light.mjs.
async function conLimiteConcorrenza<T, R>(elementi: T[], limite: number, fn: (el: T) => Promise<R>): Promise<R[]> {
  const risultati: R[] = new Array(elementi.length);
  let indice = 0;
  async function worker() {
    while (indice < elementi.length) {
      const i = indice++;
      risultati[i] = await fn(elementi[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, elementi.length) }, worker));
  return risultati;
}

async function fetchStazioniEcologiche(oggiIso: string): Promise<StazioneEcologica[]> {
  const urlLista = new URL(`${API_BASE}/getListaStazioniEcologiche.php`);
  urlLista.searchParams.set("idComune", String(ID_COMUNE_TRIESTE));
  urlLista.searchParams.set("isBusiness", "0");
  const lista = await fetchJson(urlLista.toString());

  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error("elenco stazioni ecologiche vuoto o non valido");
  }

  return conLimiteConcorrenza(lista, CONCORRENZA, (staz) => fetchStazione(staz, oggiIso));
}

function oggiIsoEuropeRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

function comuneTriesteBase(): Omit<ComuneRifiuti, "stazioni_ecologiche" | "stale"> {
  return {
    slug: "trieste",
    nome: "Trieste",
    provincia: "trieste",
    gestore: "AcegasApsAmga",
    aree: [],
    centro_raccolta: null,
    campane_vetro: [],
  };
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

  // Read-modify-write: leggiamo l'intero snapshot condiviso "rifiuti" e
  // tocchiamo SOLO la riga "trieste", per non calpestare i comuni degli
  // altri tre gestori scritti da scripts/ingest-light.mjs (v. commento
  // in testa al file sul perché l'ordine fra le due esecuzioni non è
  // rilevante).
  const { data: riga, error: erroreLettura } = await supabase
    .from("snapshots")
    .select("data")
    .eq("id", "rifiuti")
    .maybeSingle();
  if (erroreLettura) {
    return NextResponse.json({ error: `lettura snapshot fallita: ${erroreLettura.message}` }, { status: 500 });
  }

  const snapshotEsistente = (riga?.data as SnapshotRifiuti | null) ?? null;
  const comuniEsistenti: ComuneRifiuti[] = Array.isArray(snapshotEsistente?.comuni) ? snapshotEsistente!.comuni : [];
  const vecchioTrieste = comuniEsistenti.find((c) => c.slug === "trieste") ?? null;

  const oggiIso = oggiIsoEuropeRome();
  let ok = true;
  let messaggioErrore: string | null = null;
  let nuovoTrieste: ComuneRifiuti;

  try {
    const stazioni = await fetchStazioniEcologiche(oggiIso);
    nuovoTrieste = { ...comuneTriesteBase(), stazioni_ecologiche: stazioni, stale: false };
    console.log(`Rifiuti (AcegasApsAmga): ${stazioni.length} stazioni ecologiche per Trieste.`);
  } catch (err) {
    ok = false;
    messaggioErrore = err instanceof Error ? err.message : String(err);
    console.warn(`Rifiuti (AcegasApsAmga): errore, mantengo l'ultima riga nota: ${messaggioErrore}`);
    // Stesso principio di fallback già usato per tutti gli altri
    // gestori in scripts/ingest-light.mjs: se esiste già una riga
    // "trieste" la riproponiamo marcata stale; se non esiste nemmeno
    // quella (bootstrap), scriviamo comunque una riga Trieste vuota e
    // stale invece di ometterla — la ricerca via/calendario dal vivo
    // (RifiutiTriesteCalendario.tsx) non dipende da questo fetch e non
    // deve sparire dal menu comuni solo perché le stazioni ecologiche
    // non si sono ancora aggiornate.
    nuovoTrieste = vecchioTrieste
      ? { ...vecchioTrieste, stale: true }
      : { ...comuneTriesteBase(), stazioni_ecologiche: [], stale: true };
  }

  const comuni = [...comuniEsistenti.filter((c) => c.slug !== "trieste"), nuovoTrieste];

  const { error: erroreScrittura } = await supabase.from("snapshots").upsert({
    id: "rifiuti",
    module: "ambiente",
    zone: null,
    data: { comuni, aggiornato_al: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  if (erroreScrittura) {
    return NextResponse.json({ error: `scrittura snapshot fallita: ${erroreScrittura.message}` }, { status: 500 });
  }

  return NextResponse.json(
    { ok, stazioni: nuovoTrieste.stazioni_ecologiche?.length ?? 0, errore: messaggioErrore },
    { status: ok ? 200 : 502 }
  );
}
