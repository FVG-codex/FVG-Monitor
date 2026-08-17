"use client";

import { useEffect, useState } from "react";
import { HtmlEmbed } from "@/components/HtmlEmbed";
import type { ProvinciaSlug } from "@/lib/province";

/**
 * Widget ufficiale Allerta Protezione Civile FVG, uno per provincia
 * (stesso schema del widget meteo ARPA). Va richiesto singolarmente
 * per Trieste / Udine / Gorizia / Pordenone su
 * protezionecivile.fvg.it/it/widget-allerta — vedi README, sezione Fase 1.
 *
 * Il widget ufficiale si mostra da solo (rimuove `display: none` dal
 * proprio div) SOLO quando c'è un'allerta attiva per quel comune —
 * altrimenti resta invisibile by design. Mostriamo un messaggio
 * "nessuna allerta attiva" di cortesia quando resta nascosto, per non
 * lasciare il pannello con un vuoto che sembra rotto.
 */
const SNIPPET_PER_CITTA: Record<ProvinciaSlug, string | null> = {
  trieste: `<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="32006"></div>`,
  udine: `<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="30129"></div>`,
  gorizia: `<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="31007"></div>`,
  pordenone: `<script type="text/javascript" src="https://www.protezionecivile.fvg.it/widgets/pcrfvgit_alert.js"></script><div class="pcrfvgit_alert_widget" data-istatcode="93033"></div>`,
};

export function AllertaWidgetSlot({ slug, cittaNome }: { slug: ProvinciaSlug; cittaNome: string }) {
  const snippet = SNIPPET_PER_CITTA[slug];
  const [nessunaAllerta, setNessunaAllerta] = useState(false);

  useEffect(() => {
    if (!snippet) return;
    // Il widget ufficiale carica in modo asincrono; controlliamo dopo
    // un breve ritardo se il suo div è rimasto display:none — in tal
    // caso non c'è un'allerta attiva, mostriamo il nostro messaggio.
    const id = setTimeout(() => {
      const el = document.querySelector(`.pcrfvgit_alert_widget[data-istatcode]`);
      if (el && getComputedStyle(el).display === "none") {
        setNessunaAllerta(true);
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [snippet]);

  if (!snippet) {
    return (
      <div className="border border-line rounded p-3 text-xs font-mono text-ink-faint">
        Widget ufficiale Protezione Civile FVG per {cittaNome} non ancora collegato — vedi
        README, sezione Fase 1, per richiederlo e incollarlo qui.
      </div>
    );
  }

  return (
    <div>
      <HtmlEmbed html={snippet} />
      {nessunaAllerta && (
        <p className="text-ink-faint text-sm font-mono">Nessuna allerta attiva al momento.</p>
      )}
    </div>
  );
}
