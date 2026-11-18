// Modulo "Social" (18/11/2026) — testi di un post programmato, in JSON.
//
//   GET /api/social/<tipo>?giorno=YYYY-MM-DD[&demo=1]
//
// Usata da scripts/social-publish.mjs (GitHub Actions): restituisce i
// testi per Telegram/Facebook/Instagram/WhatsApp e `pronto: false` se i
// dati della giornata non ci sono ancora (lo script riproverà al giro
// successivo). L'immagine è su /api/social/<tipo>/immagine.
//
// Pubblica e senza segreti di proposito: contiene solo dati già visibili
// sul sito. Le API route sono escluse dal middleware (vedi matcher in
// middleware.ts), quindi restano raggiungibili anche con la variante
// "con password" del sito.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GENERATORI, urlSitoPubblico } from "@/lib/social";
import { giornoLocale } from "@/lib/social/comune";

export async function GET(req: NextRequest, { params }: { params: { tipo: string } }) {
  const generatore = GENERATORI[params.tipo];
  if (!generatore) return NextResponse.json({ errore: `Tipo sconosciuto: ${params.tipo}` }, { status: 404 });

  const giorno = req.nextUrl.searchParams.get("giorno") || giornoLocale();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return NextResponse.json({ errore: "giorno non valido" }, { status: 400 });
  const demo = req.nextUrl.searchParams.get("demo") === "1";

  try {
    const dati = await generatore.caricaDati({ demo, giorno });
    const contenuto = generatore.contenuto(dati, { giorno, urlSito: urlSitoPubblico(req.nextUrl.origin) });
    return NextResponse.json(contenuto, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ errore: (err as Error).message }, { status: 500 });
  }
}
