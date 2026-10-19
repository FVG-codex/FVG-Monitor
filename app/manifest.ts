import type { MetadataRoute } from "next";

// Manifest PWA (19/10/2026) — base per le app Android/iOS.
// Servito da Next.js come /manifest.webmanifest: il matcher del
// middleware esclude i percorsi con estensione, quindi next-intl non
// ci aggiunge il prefisso di lingua. Le icone sono generate da
// mobile/scripts/genera-icone.py (vedi mobile/README.md).
// Colori = tema scuro "Adriatico notturno" (--color-bg in globals.css).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FVG Monitor",
    short_name: "FVG Monitor",
    description:
      "Meteo, allerte, viabilità, trasporti e notizie del Friuli Venezia Giulia in un'unica pagina.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0E2529",
    theme_color: "#0E2529",
    lang: "it",
    categories: ["weather", "news", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
