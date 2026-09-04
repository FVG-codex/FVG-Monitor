/**
 * Nessun feed/RSS pubblico trovato per il TGR FVG (verificato più
 * volte durante la mappatura fonti) — a differenza degli altri
 * moduli, qui non c'è ingestione automatica: un link diretto alla
 * sezione ufficiale, come deciso nel piano di lavoro (Fase 3).
 */
export function TgrCard() {
  return (
    <a
      href="https://www.rainews.it/tgr/fvg"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 group"
    >
      <div className="w-[100px] h-[58px] flex-shrink-0 bg-panel-alt border border-line rounded flex items-center justify-center relative">
        <div
          className="w-0 h-0 ml-1"
          style={{
            borderStyle: "solid",
            borderWidth: "7px 0 7px 11px",
            borderColor: "transparent transparent transparent var(--ink-dim, #9DB3AE)",
          }}
        />
      </div>
      <div>
        <div className="font-cond font-semibold text-[15px] group-hover:text-cool-ink transition-colors">
          Guarda l&apos;ultimo notiziario
        </div>
        <div className="text-ink-faint text-xs font-mono mt-1">
          TGR Rai Friuli Venezia Giulia →<span className="sr-only"> (si apre in una nuova scheda)</span>
        </div>
      </div>
    </a>
  );
}
