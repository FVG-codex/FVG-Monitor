import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

// Immagine Open Graph generica per tutto il sito (17/11/2026,
// SEO/metadata per-pagina — vedi claude/fvgmonitor-stato.md, sessione
// del 17/11/2026, e lib/seo.ts). Scope confermato con l'utente via
// AskUserQuestion: un'unica immagine generica (non su misura per
// sezione), generata con la convenzione di file di Next.js
// (`opengraph-image.tsx`) — messa qui in app/[locale]/ così si applica
// automaticamente a OGNI pagina sotto questo segmento, senza bisogno di
// ripeterla pagina per pagina né di referenziarla a mano da
// lib/seo.ts/metadataPagina() (Next.js la trova e la collega da solo a
// ogni <meta property="og:image">/<meta name="twitter:image"> del
// sito). Varia solo per `locale` (tagline tradotta), stesso identico
// sfondo/logo in ogni lingua.
//
// Colori ripresi 1:1 da app/globals.css (variante scura, quella di
// default — il sito resta scuro finché l'utente non sceglie il tema
// chiaro, vedi nota in questo stesso layout): --color-bg 14 37 41,
// --color-ink 237 232 221, --color-cool-ink 95 179 163. Nessun font
// caricato esplicitamente (next/og supporto font via buffer, non via
// next/font/google) — il font di sistema di default di @vercel/og è
// sufficiente per questa immagine semplice, senza bisogno di scaricare
// e includere un file .ttf solo per un paio di righe di testo.
export const alt = "FVG Monitor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE: Record<string, string> = {
  it: "Meteo, allerte, viabilità, trasporti e notizie",
  en: "Weather, alerts, traffic, transport and news",
  de: "Wetter, Warnungen, Verkehr, Transport und Nachrichten",
  sl: "Vreme, opozorila, promet, prevoz in novice",
  hr: "Vrijeme, upozorenja, promet, prijevoz i vijesti",
};

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tagline = TAGLINE[locale] ?? TAGLINE[routing.defaultLocale];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "rgb(14, 37, 41)",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "999px",
              backgroundColor: "rgb(95, 179, 163)",
            }}
          />
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "rgb(237, 232, 221)",
              textTransform: "uppercase",
            }}
          >
            FVG Monitor
          </div>
        </div>
        <div
          style={{
            fontSize: "34px",
            color: "rgb(157, 179, 174)",
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "56px",
            width: "220px",
            height: "6px",
            backgroundColor: "rgb(95, 179, 163)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
