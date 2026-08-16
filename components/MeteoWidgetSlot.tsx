import { ArpaWidgetEmbed } from "@/components/ArpaWidgetEmbed";
import type { ProvinciaSlug } from "@/lib/province";

/**
 * URL degli script widget ARPA FVG, uno per provincia (richiesti su
 * widget.meteo.fvg.it). Vengono eseguiti dentro un iframe isolato da
 * ArpaWidgetEmbed perché usano document.write() — vedi i commenti lì.
 */
const WIDGET_URL_PER_CITTA: Record<ProvinciaSlug, string | null> = {
  trieste: "https://widget.meteo.fvg.it/code/491/1fcd84ca.js",
  udine: "https://widget.meteo.fvg.it/code/492/a51c354b.js",
  gorizia: "https://widget.meteo.fvg.it/code/493/de5c874a.js",
  pordenone: "https://widget.meteo.fvg.it/code/494/6194f059.js",
};

export function MeteoWidgetSlot({ slug, cittaNome }: { slug: ProvinciaSlug; cittaNome: string }) {
  const url = WIDGET_URL_PER_CITTA[slug];

  if (!url) {
    return (
      <div className="border border-line rounded p-3 text-xs font-mono text-ink-faint">
        Widget ufficiale ARPA FVG per {cittaNome} non ancora collegato — richiedilo su
        widget.meteo.fvg.it indicando questa località, poi incolla l'URL dello script in
        components/MeteoWidgetSlot.tsx.
      </div>
    );
  }

  return <ArpaWidgetEmbed scriptUrl={url} />;
}
