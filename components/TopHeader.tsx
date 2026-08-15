"use client";

import { useEffect, useState } from "react";

const CITTA = ["Tutta la regione", "Trieste", "Udine", "Gorizia", "Pordenone"];

export function TopHeader() {
  const [ora, setOra] = useState<string>("");
  const [data, setData] = useState<string>("");
  const [attiva, setAttiva] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setOra(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      setData(
        now.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="max-w-[1180px] mx-auto px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="font-cond font-bold text-[22px] tracking-[0.06em] uppercase flex items-baseline gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-cool inline-block pulse-dot" />
          FVG Monitor
        </div>

        <nav className="flex gap-0.5 font-cond font-semibold text-sm flex-wrap">
          {CITTA.map((citta, i) => (
            <button
              key={citta}
              onClick={() => setAttiva(i)}
              className={`px-3 py-1.5 rounded border transition-colors ${
                i === attiva
                  ? "bg-cool border-cool text-bg"
                  : "border-line text-ink-dim hover:text-ink hover:border-ink-faint"
              }`}
            >
              {citta}
            </button>
          ))}
        </nav>

        <div className="font-mono text-right leading-relaxed">
          <div className="text-[13px] text-ink-dim">{ora}</div>
          <div className="text-xs text-ink-faint">{data}</div>
        </div>
      </div>
    </header>
  );
}
