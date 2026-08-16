import { HtmlEmbed } from "@/components/HtmlEmbed";

/**
 * Il Widget Allerta della Protezione Civile FVG blocca l'accesso
 * automatico (robots.txt), quindi non va scrapato: va richiesto/
 * generato manualmente su protezionecivile.fvg.it/it/widget-allerta
 * e incollato qui sotto. Vedi README, sezione Fase 1.
 */
const SNIPPET: string | null = null; // incolla qui lo snippet ricevuto, poi sostituisci null con la stringa

export function AllertaWidgetSlot() {
  if (!SNIPPET) {
    return (
      <div className="border border-line rounded p-3 text-xs font-mono text-ink-faint">
        Widget ufficiale Protezione Civile FVG non ancora collegato — vedi README, sezione
        Fase 1, per richiederlo e incollarlo qui.
      </div>
    );
  }

  return <HtmlEmbed html={SNIPPET} />;
}
