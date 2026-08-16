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
    const container = ref.current;
    if (!container) return;
    container.innerHTML = html;

    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });
  }, [html]);

  return <div ref={ref} />;
}
