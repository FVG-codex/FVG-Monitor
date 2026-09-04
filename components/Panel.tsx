import type { ReactNode } from "react";

export function Panel({
  title,
  linkLabel,
  linkHref,
  span,
  children,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  span?: 2 | 3;
  children: ReactNode;
}) {
  const spanClass = span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : "";

  return (
    <div className={`bg-panel p-5 ${spanClass}`}>
      <div className="flex items-center justify-between mb-3.5">
        {/* h2 invece di span (Fase 4 — Accessibilità, 24/08/2026): ogni
            Panel è di fatto una sezione della pagina — usare un heading
            reale permette la navigazione per intestazioni con uno screen
            reader (con un'ottantina di pannelli nel sito, un ausilio
            concreto). L'aspetto visivo non cambia: Tailwind preflight
            azzera già margini/dimensioni di default degli heading, lo
            stile resta interamente quello delle classi qui sotto. */}
        <h2 className="font-cond font-semibold text-[13px] tracking-[0.09em] uppercase text-ink-dim">
          {title}
        </h2>
        {linkLabel && linkHref && (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-ink-faint hover:text-cool-ink transition-colors"
          >
            {linkLabel}
            {/* Fase 4 — Accessibilità (24/08/2026): avviso per chi usa uno
                screen reader che il link apre una nuova scheda (WCAG 3.2.5),
                invisibile a schermo. Ripetuto nello stesso modo su tutti i
                link target="_blank" del sito. */}
            <span className="sr-only"> (si apre in una nuova scheda)</span>
          </a>
        )}
      </div>
      {children}
    </div>
  );
}
