// Modulo "Social" (18/11/2026) — card di un post programmato.
//
//   GET /api/social/<tipo>/immagine?giorno=YYYY-MM-DD[&demo=1][&formato=png]
//
// 1080×1350 (4:5, il formato verticale più grande accettato da
// Instagram; va bene anche per Facebook e Telegram). Di default JPEG:
// l'API di pubblicazione di Instagram accetta SOLO JPEG, mentre next/og
// produce PNG → conversione con sharp. Meta e Telegram scaricano
// l'immagine da questo URL, quindi deve restare pubblico.
//
// Font: Barlow Condensed e Newsreader (gli stessi del sito, licenza
// OFL), file .woff in public/fonts/social/ — satori (il motore di
// next/og) non legge il formato woff2 usato da next/font.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { GENERATORI } from "@/lib/social";
import { giornoLocale } from "@/lib/social/comune";

const LARGHEZZA = 1080;
const ALTEZZA = 1350;

const FONT = [
  { name: "Barlow", file: "barlow-condensed-latin-600-normal.woff", weight: 600, style: "normal" },
  { name: "Barlow", file: "barlow-condensed-latin-700-normal.woff", weight: 700, style: "normal" },
  { name: "Newsreader", file: "newsreader-latin-400-normal.woff", weight: 400, style: "normal" },
  { name: "Newsreader", file: "newsreader-latin-400-italic.woff", weight: 400, style: "italic" },
] as const;

let fontInCache: { name: string; data: ArrayBuffer; weight: 600 | 700 | 400; style: "normal" | "italic" }[] | null = null;

async function caricaFont(origine: string) {
  if (fontInCache) return fontInCache;
  fontInCache = await Promise.all(
    FONT.map(async (f) => {
      const res = await fetch(`${origine}/fonts/social/${f.file}`);
      if (!res.ok) throw new Error(`Font ${f.file} non trovato (HTTP ${res.status})`);
      return { name: f.name, data: await res.arrayBuffer(), weight: f.weight, style: f.style };
    })
  );
  return fontInCache;
}

export async function GET(req: NextRequest, { params }: { params: { tipo: string } }) {
  const generatore = GENERATORI[params.tipo];
  if (!generatore) return NextResponse.json({ errore: `Tipo sconosciuto: ${params.tipo}` }, { status: 404 });

  const giorno = req.nextUrl.searchParams.get("giorno") || giornoLocale();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return NextResponse.json({ errore: "giorno non valido" }, { status: 400 });
  const demo = req.nextUrl.searchParams.get("demo") === "1";
  const formato = req.nextUrl.searchParams.get("formato") === "png" ? "png" : "jpg";

  try {
    const [dati, fonts] = await Promise.all([generatore.caricaDati({ demo, giorno }), caricaFont(req.nextUrl.origin)]);
    const immagine = new ImageResponse(generatore.card(dati, { giorno }), { width: LARGHEZZA, height: ALTEZZA, fonts });
    const png = Buffer.from(await immagine.arrayBuffer());

    const corpo = formato === "png" ? png : await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    return new NextResponse(corpo, {
      headers: {
        "Content-Type": formato === "png" ? "image/png" : "image/jpeg",
        // breve cache: Meta può scaricare l'immagine più volte durante la pubblicazione
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return NextResponse.json({ errore: (err as Error).message }, { status: 500 });
  }
}
