import type { Config } from "tailwindcss";

// Design token portati 1:1 dal mockup approvato (fvg-monitor-mockup.html)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0E2529",
        panel: "#153338",
        "panel-alt": "#1C3F47",
        line: "#274B50",
        ink: "#EDE8DD",
        "ink-dim": "#9DB3AE",
        // Schiarito da #6B8A87 il 24/08/2026 (Fase 4 — Accessibilità): al
        // valore originale il testo piccolo (10-11px, usato ovunque per
        // "Fonte:", orari, etichette secondarie) scendeva sotto 4.5:1 di
        // contrasto WCAG AA contro panel-alt (3.03:1). Nuovo valore ≥4.5:1
        // contro tutti e tre gli sfondi del sito (bg/panel/panel-alt).
        "ink-faint": "#92AAA8",
        // Schiarito da #BD5B37 il 24/08/2026 (Fase 4 — Accessibilità): usato
        // solo come colore di TESTO (ritardi treni/voli, citazione fonte
        // notizie — mai come sfondo), al valore originale era 3.58:1 contro
        // bg, sotto la soglia 4.5:1 per testo normale. Cambia anche lo
        // sfondo di selezione (::selection in globals.css), migliorandone
        // il contrasto di riflesso.
        warm: "#CD7554",
        cool: "#5FB3A3",
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
          verde: "#4C9A5B",
          gialla: "#E8B93E",
          arancione: "#E0812E",
          rossa: "#C1382E",
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
