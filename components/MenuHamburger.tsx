"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Sezioni extra del sito, distinte dalla navigazione principale per
// provincia (già visibile nei tab dell'header). Aggiungi qui nuove
// voci man mano che si aggiungono sezioni indipendenti.
//
// Riorganizzazione dell'11/09/2026 (richiesta dall'utente): tre voci
// che prima erano a sé — Terremoti, Webcam regionali, Strutture
// ricettive, Piste ciclabili — sono confluite in tre nuovi hub
// (Ambiente, FVG in immagini, Turismo), stesso principio già seguito
// per Farmacie → Sanità nella sessione precedente. Le pagine di
// destinazione restano tutte raggiungibili, solo un livello più in
// basso, con un breadcrumb "← <Hub>" in cima a ciascuna.
const SEZIONI_EXTRA = [
  { label: "Meteo", href: "/meteo" },
  { label: "Notizie", href: "/notizie" },
  { label: "Ambiente", href: "/ambiente" },
  { label: "Sport", href: "/sport" },
  { label: "FVG in immagini", href: "/fvg-in-immagini" },
  { label: "Viabilità", href: "/viabilita" },
  { label: "Trasporti", href: "/trasporti" },
  { label: "Aviazione", href: "/aviazione" },
  { label: "Sanità", href: "/sanita" },
  { label: "Turismo", href: "/turismo" },
  { label: "Economia", href: "/economia" },
  { label: "Commercio", href: "/commercio" },
];

export function MenuHamburger() {
  const [aperto, setAperto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bottoneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function chiudiSeFuori(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAperto(false);
    }
    // Esc per chiudere da tastiera (Fase 4 — Accessibilità, 24/08/2026):
    // prima si poteva chiudere solo cliccando fuori o su una voce — un
    // utente da tastiera restava bloccato col menu aperto. Il focus torna
    // sul bottone che lo ha aperto, come da prassi per i menu a comparsa.
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAperto(false);
        bottoneRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    document.addEventListener("keydown", chiudiConEsc);
    return () => {
      document.removeEventListener("mousedown", chiudiSeFuori);
      document.removeEventListener("keydown", chiudiConEsc);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        ref={bottoneRef}
        onClick={() => setAperto((a) => !a)}
        aria-label={aperto ? "Chiudi menu" : "Apri menu"}
        aria-expanded={aperto}
        aria-controls="menu-sezioni-extra"
        className="flex flex-col justify-center gap-[4px] w-7 h-7 flex-shrink-0"
      >
        <span className="block h-[2px] w-full bg-ink-dim" />
        <span className="block h-[2px] w-full bg-ink-dim" />
        <span className="block h-[2px] w-full bg-ink-dim" />
      </button>

      {aperto && (
        <nav
          id="menu-sezioni-extra"
          aria-label="Sezioni extra"
          className="absolute left-0 top-full mt-2 w-56 bg-panel border border-line rounded shadow-lg py-1 z-30"
        >
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
        </nav>
      )}
    </div>
  );
}
