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
        {children}
      </body>
    </html>
  );
}
