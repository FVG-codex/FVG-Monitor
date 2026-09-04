"use client";

import { useEffect, useState } from "react";
import { getTimes, getMoonIllumination } from "suncalc";
import { FVG_LAT, FVG_LON, nomeFaseLunare } from "@/lib/astro";

type DatiAstro = {
  albeggio: Date; // crepuscolo civile del mattino ("dawn")
  alba: Date; // "sunrise"
  tramonto: Date; // "sunset"
  crepuscolo: Date; // crepuscolo civile della sera ("dusk")
  faseLuna: number; // 0-1, vedi lib/astro.ts
  illuminazione: number; // 0-1
};

// getTimes() tipizza dawn/sunrise/sunset/dusk come Date | null perché alle
// alte latitudini un evento può non verificarsi in un dato giorno (notte o
// giorno polare). Il FVG (~46°N) non rientra mai in questo caso, ma il
// controllo va comunque fatto per la correttezza dei tipi — se dovesse
// mai risultare null si preferisce mostrare "non disponibile" piuttosto
// che un valore inventato.
function calcolaOggi(): DatiAstro | null {
  const ora = new Date();
  const t = getTimes(ora, FVG_LAT, FVG_LON);
  const luna = getMoonIllumination(ora);
  if (!t.dawn || !t.sunrise || !t.sunset || !t.dusk) return null;
  return {
    albeggio: t.dawn,
    alba: t.sunrise,
    tramonto: t.sunset,
    crepuscolo: t.dusk,
    faseLuna: luna.phase,
    illuminazione: luna.fraction,
  };
}

function formattaOra(d: Date): string {
  // A differenza dell'orologio di TopHeader.tsx (che mostra l'ora corrente
  // di chi guarda, quindi giustamente legata al suo fuso), qui il fuso è
  // fissato esplicitamente a Europe/Rome: l'alba a Trieste è un fatto della
  // regione, non del dispositivo di chi consulta la pagina — deve restare
  // corretto anche per chi la apre da un fuso diverso o con l'orologio del
  // dispositivo mal configurato. Verificato che il cambio automatico
  // ora legale/solare italiano è gestito correttamente dal browser.
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

/**
 * Icona SVG schematica della fase lunare — non un widget decorativo generico
 * ma una forma calcolata dalla stessa fase mostrata in testo, con la
 * convenzione dell'emisfero nord (crescente illuminata a destra, calante a
 * sinistra). Formula e sweep-flag verificati visivamente il 04/09/2026
 * rendendo le 8 fasi canoniche (0, 0.125, 0.25 … 0.875) in Chromium
 * headless: tutte corrette (falce, quarto, gibbosa, piena nella direzione
 * attesa).
 */
function IconaLuna({ fase, size = 30 }: { fase: number; size?: number }) {
  const r = 14;
  const cx = 16;
  const cy = 16;
  const cosVal = Math.cos(fase * 2 * Math.PI);
  const rx = Math.abs(r * cosVal);
  const crescente = fase < 0.5;
  const outerSweep = crescente ? 1 : 0;
  const innerSweep = crescente ? (cosVal >= 0 ? 0 : 1) : cosVal >= 0 ? 1 : 0;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r}`;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/**
 * Sole e luna — a differenza degli altri pannelli non c'è ingest/Supabase
 * dietro: i dati sono calcolati nel browser (vedi lib/astro.ts) e quindi
 * sempre "live" senza bisogno di polling. Ricalcolato ogni 30 minuti solo
 * per riflettere correttamente il cambio di giorno per chi lascia la
 * pagina aperta oltre la mezzanotte.
 */
export function SoleLunaPanel() {
  const [dati, setDati] = useState<DatiAstro | null | undefined>(undefined);

  useEffect(() => {
    setDati(calcolaOggi());
    const id = setInterval(() => setDati(calcolaOggi()), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // undefined = non ancora calcolato (primo render, prima dell'effetto);
  // null = calcolato ma con un evento assente (non capita mai in FVG).
  if (dati === undefined) {
    return <p className="text-ink-faint text-sm font-mono">Calcolo in corso…</p>;
  }
  if (dati === null) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        Calcolo astronomico non disponibile per la data odierna.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mb-3.5">
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">Albeggio</div>
          <div className="font-cond font-bold text-[24px] leading-none">{formattaOra(dati.albeggio)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">Alba</div>
          <div className="font-cond font-bold text-[24px] leading-none text-warm">{formattaOra(dati.alba)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">Tramonto</div>
          <div className="font-cond font-bold text-[24px] leading-none text-warm">{formattaOra(dati.tramonto)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">Crepuscolo</div>
          <div className="font-cond font-bold text-[24px] leading-none">{formattaOra(dati.crepuscolo)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-2 text-ink-dim">
          <IconaLuna fase={dati.faseLuna} />
          <span className="text-sm">{nomeFaseLunare(dati.faseLuna)}</span>
        </div>
        <span className="font-mono text-xs text-ink-faint">
          {Math.round(dati.illuminazione * 100)}% illuminata
        </span>
      </div>

      <p className="text-ink-faint text-[10px] font-mono mt-3">
        Riferimento: Udine (centro regione) — calcolo astronomico locale, nessuna fonte esterna
      </p>
    </div>
  );
}
