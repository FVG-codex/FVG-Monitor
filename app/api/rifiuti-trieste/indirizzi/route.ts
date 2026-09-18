// Proxy server-side per la ricerca indirizzo di Trieste su Il Rifiutologo
// (AcegasApsAmga) — v. il commento esteso sopra rifiutiIngestAcegas() in
// scripts/ingest-light.mjs per il contesto: il calendario porta a porta
// di Trieste è per via+civico specifico (non per poche aree come i
// comuni minori di Isontina), quindi non è uno snapshot precalcolato ma
// una vera ricerca dal vivo — stesso pattern proxy già usato per
// Ferrovie (app/api/treni/.../route.ts): il browser dell'utente chiama
// questa route same-origin (niente CORS), che interroga
// webapp-ambiente.gruppohera.it lato server. Scelto dall'utente il
// 18/09/2026 rispetto ad "aggiornato una volta al giorno con qualche
// indirizzo di esempio" — v. la richiesta esplicita in conversazione.
//
// idComune fisso a 424 (Trieste) — confermato costante `newIdComune` nel
// sorgente JS reale della pagina "il Rifiutologo" incollata dall'utente
// (/casa/rifiutologo/Trieste). Nomi campo (`id`, `indirizzo`,
// `indirizzo_google`) letti dallo stesso sorgente
// (initAutocompleteIndirizzo()), non indovinati.
//
// **Non confermato da questa sandbox** (irraggiungibile per fetch
// diretto, stesso blocco già noto per isontinambiente.it — qui su due
// fronti indipendenti, proxy di rete del sandbox E il sito stesso): se
// l'endpoint richiede un cookie di sessione stabilito da un caricamento
// pagina precedente (visto già una volta in questo progetto, motore
// TFVGB di turismofvg.it) o risponde normalmente a una richiesta
// server-to-server "a freddo" come questa. Da confermare al primo uso
// reale in produzione — se fallisse per questo motivo, il sintomo
// sarebbe un elenco vuoto o un errore qui sotto, non un crash silenzioso.
//
// Nessuna cache: l'elenco vie di una città non cambia quasi mai, ma si
// resta sullo stesso pattern "sempre fresco" già usato altrove in questo
// progetto per i proxy same-origin, invece di introdurre un livello di
// cache su una fonte non ancora verificata in produzione.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ID_COMUNE_TRIESTE = 424;
const API_BASE = "https://webapp-ambiente.gruppohera.it/rifiutologo/rifiutologoweb";

type IndirizzoGrezzo = {
  id: number | string;
  indirizzo: string;
  indirizzo_google?: string | null;
};

export async function GET() {
  const url = `${API_BASE}/getIndirizzi.php?idComune=${ID_COMUNE_TRIESTE}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "*/*",
        Referer: "https://www.ilrifiutologo.it/",
        Origin: "https://www.ilrifiutologo.it",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Il Rifiutologo HTTP ${res.status}` }, { status: 502 });
    }
    const righe: IndirizzoGrezzo[] = await res.json();
    if (!Array.isArray(righe)) {
      return NextResponse.json([]);
    }
    return NextResponse.json(
      righe
        .map((r) => ({
          id: Number(r.id),
          indirizzo: String(r.indirizzo ?? "").trim(),
          indirizzoGoogle: r.indirizzo_google ? String(r.indirizzo_google).trim() : null,
        }))
        .filter((r) => Number.isFinite(r.id) && r.indirizzo.length > 0)
    );
  } catch {
    return NextResponse.json({ error: "fetch a Il Rifiutologo fallito" }, { status: 502 });
  }
}
