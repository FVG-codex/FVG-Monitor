"use client";

import { useEffect, useRef } from "react";

/**
 * React non esegue i tag <script> presenti in html iniettato via
 * dangerouslySetInnerHTML — vanno ricreati manualmente per farli
 * girare. Serve per incollare gli snippet embed di terze parti
 * (widget ARPA, widget Protezione Civile) così come li si riceve,
 * senza doverli riscrivere a mano.
 */
export function HtmlEmbed({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const container = ref.current;
      if (!container) {
        console.warn("[HtmlEmbed] ref.current è null, il contenitore non esiste ancora");
        return;
      }
      container.innerHTML = html;

      const scripts = Array.from(container.querySelectorAll("script"));
      console.log(`[HtmlEmbed] trovati ${scripts.length} script da eseguire`);
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      console.log("[HtmlEmbed] completato senza errori");
    } catch (err) {
      console.error("[HtmlEmbed] errore durante l'iniezione:", err);
    }
  }, [html]);

  // Il testo "[widget in caricamento]" è solo un segnale diagnostico
  // temporaneo: se resta visibile, vuol dire che l'effetto sopra non
  // è mai partito. Va rimosso una volta risolto il problema.
  return <div ref={ref}>[widget in caricamento]</div>;
}
