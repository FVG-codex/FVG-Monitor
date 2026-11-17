import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { ROUTE_PATHS, urlAssoluto, alternateLingue } from "@/lib/seo";

// SEO/metadata per-pagina (17/11/2026) — vedi claude/fvgmonitor-stato.md,
// sessione del 17/11/2026, e lib/seo.ts. Il sito non aveva finora
// nessun sitemap.ts (confermato con `ls app/sitemap*` durante la
// verifica del cross-check). `ROUTE_PATHS` (in lib/seo.ts) è la stessa
// lista piatta di route di primo livello già usata per i <title> — qui
// si genera una voce per ciascuna, moltiplicata per le 5 lingue (più la
// home, "/", trattata a parte perché non compare in ROUTE_PATHS), con
// gli stessi link hreflang già presenti nell'HTML di ogni pagina
// (`alternates.languages` di un sitemap entry produce lo stesso
// `<xhtml:link rel="alternate" hreflang="...">` del tag <head> — non un
// dato nuovo, solo lo stesso già costruito da `alternateLingue()` in
// un secondo posto che i motori di ricerca leggono). "/login" esclusa
// di proposito (vedi anche app/robots.ts) — pagina di servizio, nessun
// contenuto indicizzabile.
//
// `lastModified` fissato al momento della build/richiesta per ogni
// voce: il sito è interamente a rendering dinamico
// (`export const dynamic = "force-dynamic"` nel layout, vedi quel
// file) — non esiste una vera "ultima modifica" per pagina da leggere,
// i dati sottostanti (meteo/notizie/eventi/...) cambiano in
// continuazione. Usare "adesso" per tutte le voci a ogni rigenerazione
// del sitemap è l'approssimazione standard in questo caso (meglio di
// una data fissa/inventata), i motori di ricerca la trattano solo come
// indicazione di quando ricontrollare, non come garanzia.
export default function sitemap(): MetadataRoute.Sitemap {
  const adesso = new Date();
  const tutteLePagine = ["/", ...ROUTE_PATHS];

  const voci: MetadataRoute.Sitemap = [];
  for (const pathname of tutteLePagine) {
    for (const locale of routing.locales) {
      voci.push({
        url: urlAssoluto(pathname, locale),
        lastModified: adesso,
        changeFrequency: pathname === "/" ? "always" : "hourly",
        priority: pathname === "/" ? 1 : 0.6,
        alternates: { languages: alternateLingue(pathname) },
      });
    }
  }
  return voci;
}
