import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// SEO/metadata per-pagina (17/11/2026) — vedi claude/fvgmonitor-stato.md,
// sessione del 17/11/2026, e lib/seo.ts. Il sito non aveva finora
// nessun robots.ts (confermato con `ls app/robots*` durante la
// verifica del cross-check): questo autorizza l'indicizzazione di
// tutto tranne "/login" (pagina di servizio, nessun contenuto, non ha
// senso in un risultato di ricerca — vedi anche app/sitemap.ts, che la
// esclude per lo stesso motivo) e "/api/" (endpoint di dati, non
// pagine). Serve a /robots.txt dalla root del dominio, senza prefisso
// di lingua (ha un'estensione nel percorso — qui ".txt" — quindi il
// middleware next-intl lo esclude già di suo, vedi middleware.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
