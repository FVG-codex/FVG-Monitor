import { HtmlEmbed } from "@/components/HtmlEmbed";
import type { ProvinciaSlug } from "@/lib/province";

/**
 * Widget ufficiale Allerta Protezione Civile FVG, uno per provincia
 * (stesso schema del widget meteo ARPA). Va richiesto singolarmente
 * per Trieste / Udine / Gorizia / Pordenone su
 * protezionecivile.fvg.it/it/widget-allerta — vedi README, sezione Fase 1.
 *
 * IMPORTANTE: se lo snippet ricevuto è uno <script src="..."> (non un
 * <iframe> diretto), controlla se il file JS collegato usa
 * document.write() come i widget meteo — in tal caso non va incollato
 * qui con HtmlEmbed, ma gestito con lo stesso pattern a iframe isolato
 * di ArpaWidgetEmbed.tsx (vedi MeteoWidgetSlot.tsx per l'esempio).
 */
const SNIPPET_PER_CITTA: Record<ProvinciaSlug, string | null> = {
  trieste: "<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="32006"></div>",
  udine: "<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="30129"></div>",
  gorizia: "<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="31007"></div>",
  pordenone: "<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="93033"></div>",
};

export function AllertaWidgetSlot({ slug, cittaNome }: { slug: ProvinciaSlug; cittaNome: string }) {
  const snippet = SNIPPET_PER_CITTA[slug];

  if (!snippet) {
    return (
      <div className="border border-line rounded p-3 text-xs font-mono text-ink-faint">
        Widget ufficiale Protezione Civile FVG per {cittaNome} non ancora collegato — vedi
        README, sezione Fase 1, per richiederlo e incollarlo qui.
      </div>
    );
  }

  return <HtmlEmbed html={snippet} />;
}
