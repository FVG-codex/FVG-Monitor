// Proxy server-side per l'elenco civici di un indirizzo di Trieste — v.
// il commento esteso in app/api/rifiuti-trieste/indirizzi/route.ts per
// il contesto generale di questo modulo (ricerca indirizzo dal vivo per
// il calendario porta a porta AcegasApsAmga/Il Rifiutologo).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = "https://webapp-ambiente.gruppohera.it/rifiutologo/rifiutologoweb";

// Accetta solo un id numerico (l'`id` restituito da getIndirizzi.php),
// per non trasformare questa route in un proxy aperto verso qualunque
// URL — stessa cautela già usata per il codice stazione in
// app/api/treni/[tipo]/[stazione]/route.ts.
const ID_INDIRIZZO_VALIDO = /^\d+$/;

type CivicoGrezzo = {
  id: number | string;
  numeroCivico: string;
};

export async function GET(_req: Request, { params }: { params: { idIndirizzo: string } }) {
  const { idIndirizzo } = params;
  if (!ID_INDIRIZZO_VALIDO.test(idIndirizzo)) {
    return NextResponse.json({ error: "idIndirizzo non valido" }, { status: 400 });
  }

  const url = `${API_BASE}/getNumeriCivici.php?idIndirizzo=${idIndirizzo}`;

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
    const righe: CivicoGrezzo[] = await res.json();

    // Il sito reale, quando l'indirizzo non ha civici distinti (vie a
    // civico unico/senza numerazione dettagliata), sostituisce l'elenco
    // vuoto con un'opzione fittizia "Tutti i civici" (id: -1) — vedi
    // getListaCivici() nel sorgente JS reale. Replicato qui invece di
    // restituire un array vuoto che ogni chiamante dovrebbe reinterpretare
    // a modo suo.
    if (!Array.isArray(righe) || righe.length === 0) {
      return NextResponse.json([{ id: -1, numeroCivico: "Tutti i civici" }]);
    }

    return NextResponse.json(
      righe.map((r) => ({ id: Number(r.id), numeroCivico: String(r.numeroCivico ?? "").trim() }))
    );
  } catch {
    return NextResponse.json({ error: "fetch a Il Rifiutologo fallito" }, { status: 502 });
  }
}
