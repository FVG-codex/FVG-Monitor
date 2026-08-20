"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Sezioni extra del sito, distinte dalla navigazione principale per
// provincia (già visibile nei tab dell'header). Aggiungi qui nuove
// voci man mano che si aggiungono sezioni indipendenti.
const SEZIONI_EXTRA = [
  { label: "Risultati calcistici", href: "/calcio" },
  { label: "Risultati basket", href: "/basket" },
  { label: "Risultati baseball", href: "/baseball" },
  { label: "Webcam regionali", href: "/webcam" },
  { label: "Viabilità", href: "/viabilita" },
];

export function MenuHamburger() {
  const [aperto, setAperto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function chiudiSeFuori(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAperto(false);
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    return () => document.removeEventListener("mousedown", chiudiSeFuori);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAperto((a) => !a)}
        aria-label="Apri menu"
        aria-expanded={aperto}
        className="flex flex-col justify-center gap-[4px] w-7 h-7 flex-shrink-0"
      >
        <span className="block h-[2px] w-full bg-ink-dim" />
        <span className="block h-[2px] w-full bg-ink-dim" />
        <span className="block h-[2px] w-full bg-ink-dim" />
      </button>

      {aperto && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-panel border border-line rounded shadow-lg py-1 z-30">
          {SEZIONI_EXTRA.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setAperto(false)}
              className="block px-4 py-2.5 text-sm text-ink-dim hover:text-ink hover:bg-panel-alt transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
