// Proxy server-side per il calendario porta a porta di un indirizzo di
// Trieste (AcegasApsAmga/Il Rifiutologo) — v. il commento esteso in
// app/api/rifiuti-trieste/indirizzi/route.ts per il contesto generale.
//
// Endpoint e parametri confermati dal sorgente JS reale della pagina
// "il Rifiutologo" incollata dall'utente (funzione getCalendarioPAP()):
// getCalendarioPap.php con idComune/idIndirizzo/idCivico/isBusiness/
// idCategoriaAzienda/date/giorniDaMostrare. Risposta osservata nello
// stesso sorgente (initCalendarioPAP()):
//   { notaPap: string, calendario: [{ data, conferimenti: [{
//     macroprodotto: { descrizione, pittogramma: { nomeFile, colore } },
//     orario, note } ] }] }
// — "orario" è l'orario di ESPOSIZIONE (quando mettere fuori il
// rifiuto), non un orario di apertura; "conferimenti" può avere più
// voci lo stesso giorno (più categorie ritirate lo stesso giorno).
//
// idCategoriaAzienda sempre vuoto qui: questa route copre solo il
// flusso "casa" (isBusiness=0), coerente con "solo comune"/v1 già scelto
// per gli altri tre gestori — il flusso "attività commerciali" (con
// categoria azienda) resta fuori scope.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ID_COMUNE_TRIESTE = 424;
const API_BASE = "https://webapp-ambiente.gruppohera.it/rifiutologo/rifiutologoweb";

// idIndirizzo: id numerico da getIndirizzi.php. idCivico: id numerico da
// getNumeriCivici.php, oppure "-1"/vuoto per "Tutti i civici" (v. quella
// route) — in quel caso, come nel sito reale, il parametro va mandato
// vuoto all'API, non "-1" letterale.
const ID_INDIRIZZO_VALIDO = /^\d+$/;
const ID_CIVICO_VALIDO = /^-?\d+$/;

// Stesso identico problema di fuso orario già risolto in
// app/api/treni/[tipo]/[stazione]/route.ts (formattaOrarioRichiesta):
// le funzioni serverless girano in UTC, non nel fuso orario italiano —
// calcolato esplicitamente in Europe/Rome invece di usare l'ora
// "locale" del processo.
function dataRichiestaEuropeRome(d: Date): string {
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
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

// I campi macroprodotto.descrizione/note possono contenere HTML (v.
// stesso problema già risolto in rifiutiIngestAcegas(), pulito allo
// stesso modo qui invece di passarlo grezzo al frontend).
function pulisciTesto(s: unknown): string {
  return typeof s === "string" ? s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idIndirizzo = searchParams.get("idIndirizzo") ?? "";
  const idCivicoRaw = searchParams.get("idCivico") ?? "";

  if (!ID_INDIRIZZO_VALIDO.test(idIndirizzo)) {
    return NextResponse.json({ error: "idIndirizzo non valido" }, { status: 400 });
  }
  if (idCivicoRaw !== "" && !ID_CIVICO_VALIDO.test(idCivicoRaw)) {
    return NextResponse.json({ error: "idCivico non valido" }, { status: 400 });
  }
  const idCivico = idCivicoRaw && Number(idCivicoRaw) > 0 ? idCivicoRaw : "";

  const url = new URL(`${API_BASE}/getCalendarioPap.php`);
  url.searchParams.set("idComune", String(ID_COMUNE_TRIESTE));
  url.searchParams.set("idIndirizzo", idIndirizzo);
  url.searchParams.set("idCivico", idCivico);
  url.searchParams.set("isBusiness", "0");
  url.searchParams.set("idCategoriaAzienda", "");
  url.searchParams.set("date", dataRichiestaEuropeRome(new Date()));
  url.searchParams.set("giorniDaMostrare", "31");

  try {
    const res = await fetch(url.toString(), {
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
    const dati = await res.json();
    const calendario = Array.isArray(dati?.calendario) ? dati.calendario : [];

    return NextResponse.json({
      nota: pulisciTesto(dati?.notaPap) || null,
      giorni: calendario.map((g: { data?: unknown; conferimenti?: unknown }) => ({
        data: String(g?.data ?? "").slice(0, 10),
        conferimenti: Array.isArray(g?.conferimenti)
          ? g.conferimenti.map(
              (c: { macroprodotto?: { descrizione?: unknown; pittogramma?: { colore?: unknown } }; orario?: unknown; note?: unknown }) => ({
                descrizione: pulisciTesto(c?.macroprodotto?.descrizione) || "Raccolta",
                orario: pulisciTesto(c?.orario) || null,
                note: pulisciTesto(c?.note) || null,
                colore: typeof c?.macroprodotto?.pittogramma?.colore === "string" ? c.macroprodotto.pittogramma.colore : null,
              })
            )
          : [],
      })),
    });
  } catch {
    return NextResponse.json({ error: "fetch a Il Rifiutologo fallito" }, { status: 502 });
  }
}
