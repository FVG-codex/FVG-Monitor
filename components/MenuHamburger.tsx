"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
//
// Fase 1 — Multilingua (03/10/2026): le etichette ora vengono dalla
// chiave di traduzione `nav.*` (messages/it.json, messages/en.json)
// invece che da una stringa fissa qui — `href` resta la chiave unica
// che non cambia con la lingua (next-intl usa il `Link` locale-aware
// per anteporre /en quando serve).
//
// `emoji` (09/10/2026, richiesto dall'utente): puramente decorativa,
// non tradotta (le emoji non hanno bisogno di traduzione) e non letta
// da screen reader — vedi `aria-hidden` sotto, altrimenti un lettore
// annuncerebbe anche il nome dell'emoji prima dell'etichetta vera.
const SEZIONI_EXTRA = [
  { chiave: "meteo", href: "/meteo", emoji: "🌤️" },
  { chiave: "notizie", href: "/notizie", emoji: "📰" },
  { chiave: "ambiente", href: "/ambiente", emoji: "🌿" },
  { chiave: "sport", href: "/sport", emoji: "⚽" },
  { chiave: "immagini", href: "/fvg-in-immagini", emoji: "📷" },
  { chiave: "viabilita", href: "/viabilita", emoji: "🚧" },
  { chiave: "trasporti", href: "/trasporti", emoji: "🚌" },
  { chiave: "aviazione", href: "/aviazione", emoji: "✈️" },
  { chiave: "sanita", href: "/sanita", emoji: "🏥" },
  { chiave: "turismo", href: "/turismo", emoji: "🧳" },
  { chiave: "economia", href: "/economia", emoji: "📈" },
  { chiave: "commercio", href: "/commercio", emoji: "🛒" },
] as const;

export function MenuHamburger() {
  const t = useTranslations("nav");
  const tChrome = useTranslations("chrome");
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
        aria-label={aperto ? tChrome("menuClose") : tChrome("menuOpen")}
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
          aria-label={tChrome("menuExtraSections")}
          className="absolute left-0 top-full mt-2 w-56 bg-panel border border-line rounded shadow-lg py-1 z-30"
        >
          {SEZIONI_EXTRA.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setAperto(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-dim hover:text-ink hover:bg-panel-alt transition-colors"
            >
              <span aria-hidden="true">{s.emoji}</span>
              {t(s.chiave)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
