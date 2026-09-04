"use client";

import { useEffect, useState } from "react";

// Tema chiaro/scuro (04/09/2026). Il default resta il tema scuro storico
// del sito ("Adriatico notturno") — questo pulsante è l'unico modo per
// passare al chiaro, "su richiesta dell'utente": nessuna rilevazione
// automatica di prefers-color-scheme, la preferenza va scelta a mano e
// resta poi salvata in localStorage (persistita tra le visite, ma solo
// su questo browser/dispositivo — coerente con l'uso già fatto di
// localStorage nel progetto per altre preferenze lato client).
//
// Lo script inline in app/layout.tsx applica la preferenza salvata
// PRIMA del render per evitare un flash del tema sbagliato al
// caricamento; questo componente si limita a leggere lo stato già
// impostato su <html> al mount e a offrire il pulsante per cambiarlo.
const CHIAVE_STORAGE = "fvgmonitor-tema";

type Tema = "scuro" | "chiaro";

function leggiTemaAttuale(): Tema {
  return document.documentElement.dataset.theme === "light" ? "chiaro" : "scuro";
}

export function ThemeToggle() {
  // null finché non montato lato client: evita di mostrare per un
  // istante lo stato sbagliato prima che sappiamo cosa ha impostato lo
  // script inline (rilevante soprattutto se l'utente aveva scelto il
  // tema chiaro su un dispositivo diverso dall'ultimo usato).
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    setTema(leggiTemaAttuale());
  }, []);

  function toggle() {
    const nuovo: Tema = tema === "chiaro" ? "scuro" : "chiaro";
    setTema(nuovo);
    if (nuovo === "chiaro") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(CHIAVE_STORAGE, nuovo === "chiaro" ? "light" : "dark");
    } catch {
      // localStorage non disponibile (navigazione privata, cookie/storage
      // bloccati...): il tema scelto resta comunque valido per la
      // sessione corrente, semplicemente non verrà ricordato alla
      // prossima visita. Nessun errore da mostrare all'utente.
    }
  }

  if (tema === null) {
    // Placeholder della stessa dimensione del pulsante reale, per non far
    // "saltare" il layout dell'header quando arriva lo stato vero.
    return <span className="w-7 h-7 flex-shrink-0" aria-hidden="true" />;
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={tema === "chiaro"}
      aria-label={tema === "chiaro" ? "Passa al tema scuro" : "Passa al tema chiaro"}
      title={tema === "chiaro" ? "Tema scuro" : "Tema chiaro"}
      className="w-7 h-7 rounded border border-line text-ink-dim hover:text-ink hover:border-ink-faint transition-colors flex items-center justify-center flex-shrink-0"
    >
      {tema === "chiaro" ? (
        // Luna: pulsante mostra a cosa si passa cliccando (tema scuro)
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
        </svg>
      ) : (
        // Sole: pulsante mostra a cosa si passa cliccando (tema chiaro)
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
