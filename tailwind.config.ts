import type { Config } from "tailwindcss";

// Design token portati 1:1 dal mockup approvato (fvg-monitor-mockup.html)
//
// Tema chiaro/scuro (04/09/2026): i colori qui sotto NON sono più hex
// letterali ma leggono le variabili CSS definite in app/globals.css
// (":root" = scuro di default, "[data-theme=light]" = sovrascrittura
// chiara), nel formato rgb(var(--x) / <alpha-value>) — l'unico modo
// supportato da Tailwind per un colore "da variabile" che continui a
// funzionare coi modificatori di opacità già in uso nel sito (es.
// bg-bg/95 in TopHeader, hover:bg-panel-alt/60 in PisteCiclabiliPage).
//
// Non tutti i colori cambiano col tema. Alcuni hanno un doppio ruolo —
// sfondo FISSO di badge/pulsanti (es. cool, zone-*, allerta-*) abbinato
// a un testo di contrasto anch'esso fisso ("on-accent", usato al posto
// del vecchio trucco "text-bg" — vedi sotto) — e restano quindi
// invariati tra i due temi (nessuna riga corrispondente in
// "[data-theme=light]" in globals.css, il valore di :root resta
// valido). Dove lo stesso colore veniva usato ANCHE come testo libero
// sulla pagina (cool, allerta-verde, allerta-rossa, allerta-arancione)
// è stato introdotto un token "-ink" separato che invece CAMBIA col
// tema, verificato numericamente ≥4.5:1 WCAG AA contro bg/panel/panel-
// alt in entrambi i temi (stesso metodo di Fase 4 — Accessibilità).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        "panel-alt": "rgb(var(--color-panel-alt) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-dim": "rgb(var(--color-ink-dim) / <alpha-value>)",
        // Schiarito da #6B8A87 il 24/08/2026 (Fase 4 — Accessibilità): al
        // valore originale il testo piccolo (10-11px, usato ovunque per
        // "Fonte:", orari, etichette secondarie) scendeva sotto 4.5:1 di
        // contrasto WCAG AA contro panel-alt (3.03:1). Nuovo valore ≥4.5:1
        // contro tutti e tre gli sfondi del sito (bg/panel/panel-alt).
        // Dal 04/09/2026 il valore reale vive in --color-ink-faint (due
        // varianti, scura/chiara) — vedi nota tema sopra.
        "ink-faint": "rgb(var(--color-ink-faint) / <alpha-value>)",
        // Schiarito da #BD5B37 il 24/08/2026 (Fase 4 — Accessibilità): usato
        // solo come colore di TESTO (ritardi treni/voli, citazione fonte
        // notizie — mai come sfondo), al valore originale era 3.58:1 contro
        // bg, sotto la soglia 4.5:1 per testo normale. Cambia anche lo
        // sfondo di selezione (::selection in globals.css), migliorandone
        // il contrasto di riflesso.
        warm: "rgb(var(--color-warm) / <alpha-value>)",
        // "cool" resta un colore FISSO (sfondo di pulsanti attivi/bordi,
        // es. bg-cool, border-cool) — non cambia tra i due temi, sempre
        // abbinato al testo fisso "on-accent" sotto. Per il testo libero
        // (text-cool) usare invece "cool-ink", che SI adatta al tema.
        cool: "#5FB3A3",
        "cool-ink": "rgb(var(--color-cool-ink) / <alpha-value>)",
        // Sostituisce il vecchio trucco "bg-cool text-bg" (dove "bg" era
        // sempre lo sfondo scurissimo del tema, quindi leggibile sopra
        // "cool"): con un tema chiaro "bg" non è più garantito scuro, va
        // quindi introdotto un token dedicato, fisso, pensato apposta per
        // fare da testo sopra gli sfondi ad accento fissi (cool, zone-a,
        // zone-b) — verificato ≥4.5:1 contro entrambi.
        "on-accent": "#10262A",
        zone: {
          a: "#6FA9E0",
          b: "#5FB3A3",
          c: "#E8B93E",
          // Scurito leggermente da #BD5B37 il 24/08/2026 (Fase 4 —
          // Accessibilità): la lettera "D" nel chip (ZoneChip.tsx) è
          // passata da testo scuro a testo bianco per lo stesso motivo di
          // contrasto; questo scurimento minimo porta anche il testo
          // bianco sopra la soglia 4.5:1 (era 4.45:1, ora 4.54:1).
          d: "#BB5A36",
        },
        allerta: {
          // Colori di SFONDO dei badge (AlertBanner, ZoneChip, puntini di
          // stato...), sempre abbinati a un proprio testo di contrasto
          // fisso (bianco o #241B04) indipendente dal tema — invariati.
          verde: "#4C9A5B",
          gialla: "#E8B93E",
          arancione: "#E0812E",
          rossa: "#C1382E",
          // Varianti "-ink" per l'uso come TESTO libero sulla pagina
          // (es. "Oltre soglia", stato treni) — queste sì cambiano col
          // tema. Introdotte il 04/09/2026 insieme al tema chiaro: sono
          // anche servite a correggere un contrasto già insufficiente in
          // scuro per allerta-rossa/verde su testo piccolo (2.94:1 e
          // 3.89:1, sotto i 4.5:1 richiesti — non era stato notato nella
          // Fase 4 — Accessibilità perché lì l'analisi non aveva ricalcolato
          // questi due colori "a doppio ruolo" separatamente dal loro uso
          // come sfondo badge).
          "verde-ink": "rgb(var(--color-allerta-verde-ink) / <alpha-value>)",
          "rossa-ink": "rgb(var(--color-allerta-rossa-ink) / <alpha-value>)",
          "arancione-ink": "rgb(var(--color-allerta-arancione-ink) / <alpha-value>)",
        },
      },
      fontFamily: {
        cond: ["var(--font-barlow-condensed)", "sans-serif"],
        serif: ["var(--font-newsreader)", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
