import type { Metadata } from "next";
import { Barlow_Condensed, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "FVG Monitor",
  description:
    "Meteo, allerte, viabilità, trasporti e notizie del Friuli Venezia Giulia in un'unica pagina.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body
        className={`${barlowCondensed.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-serif`}
      >
        {/* Skip link (Fase 4 — Accessibilità, 24/08/2026): invisibile finché
            non riceve il focus da tastiera, permette di saltare header +
            menu + banner allerte e andare dritti al contenuto — ogni pagina
            del sito ripete la stessa intestazione, quindi senza questo un
            utente da tastiera dovrebbe attraversarla ad ogni pagina.
            Punta all'id "contenuto-principale" presente su ogni <main>. */}
        <a
          href="#contenuto-principale"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-cool focus:text-bg focus:px-3 focus:py-2 focus:rounded focus:font-cond focus:font-semibold"
        >
          Vai al contenuto principale
        </a>
        {children}
      </body>
    </html>
  );
}
