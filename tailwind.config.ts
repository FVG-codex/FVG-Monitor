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
        "ink-faint": "#6B8A87",
        warm: "#BD5B37",
        cool: "#5FB3A3",
        zone: {
          a: "#6FA9E0",
          b: "#5FB3A3",
          c: "#E8B93E",
          d: "#BD5B37",
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
