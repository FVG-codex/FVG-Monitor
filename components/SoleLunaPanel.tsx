"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getTimes, getMoonIllumination } from "suncalc";
import { FVG_LAT, FVG_LON, orariLunaOggi } from "@/lib/astro";
import { intlLocale } from "@/lib/intlLocale";

type DatiAstro = {
  albeggio: Date; // crepuscolo civile del mattino ("dawn")
  alba: Date; // "sunrise"
  tramonto: Date; // "sunset"
  crepuscolo: Date; // crepuscolo civile della sera ("dusk")
  faseLuna: number; // 0-1, vedi lib/astro.ts
  illuminazione: number; // 0-1
  sorgeLuna: Date | null; // null se la Luna non sorge nel giorno civile odierno, vedi lib/astro.ts
  tramontaLuna: Date | null; // null se la Luna non tramonta nel giorno civile odierno
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
  const orariLuna = orariLunaOggi(ora);
  if (!t.dawn || !t.sunrise || !t.sunset || !t.dusk) return null;
  return {
    albeggio: t.dawn,
    alba: t.sunrise,
    tramonto: t.sunset,
    crepuscolo: t.dusk,
    faseLuna: luna.phase,
    illuminazione: luna.fraction,
    sorgeLuna: orariLuna.sorge,
    tramontaLuna: orariLuna.tramonta,
  };
}

function formattaOra(d: Date, locale: string): string {
  // A differenza dell'orologio di TopHeader.tsx (che mostra l'ora corrente
  // di chi guarda, quindi giustamente legata al suo fuso), qui il fuso è
  // fissato esplicitamente a Europe/Rome: l'alba a Trieste è un fatto della
  // regione, non del dispositivo di chi consulta la pagina — deve restare
  // corretto anche per chi la apre da un fuso diverso o con l'orologio del
  // dispositivo mal configurato. Verificato che il cambio automatico
  // ora legale/solare italiano è gestito correttamente dal browser.
  // Multilingua (05/10/2026): locale passato da intlLocale(), non più
  // fisso a "it-IT" — nessuna differenza visibile con questo set di opzioni
  // fra it-IT/en-GB/de-DE (tutte orologio 24h con ":"), ma coerente col
  // resto del progetto e pronto per lingue future che potrebbero differire.
  return d.toLocaleTimeString(intlLocale(locale), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

/**
 * Multilingua (05/10/2026): replica localmente la stessa identica
 * categorizzazione di `nomeFaseLunare()` in lib/astro.ts (stesse soglie,
 * stesso ordine di controlli) ma restituisce una chiave stabile invece
 * del testo italiano diretto, tradotta sotto con
 * `t(\`faseLuna.${chiave}\`)` — stesso principio già usato altrove nel
 * progetto per non toccare un lib file condiviso (qui `nomeFaseLunare`
 * non ha altri chiamanti, ma la replica evita comunque di introdurre
 * dipendenze tra lib e messages/*.json). `lib/astro.ts` non viene
 * modificato e la sua `nomeFaseLunare()` resta disponibile per un
 * eventuale uso futuro non legato alla UI (es. log, script).
 */
function chiaveFaseLunare(
  phase: number
): "nuova" | "primoQuarto" | "piena" | "ultimoQuarto" | "crescente" | "gibbosaCrescente" | "gibbosaCalante" | "calante" {
  const p = ((phase % 1) + 1) % 1;
  const TOLLERANZA = 0.02;
  if (p < TOLLERANZA || p > 1 - TOLLERANZA) return "nuova";
  if (Math.abs(p - 0.25) < TOLLERANZA) return "primoQuarto";
  if (Math.abs(p - 0.5) < TOLLERANZA) return "piena";
  if (Math.abs(p - 0.75) < TOLLERANZA) return "ultimoQuarto";
  if (p < 0.25) return "crescente";
  if (p < 0.5) return "gibbosaCrescente";
  if (p < 0.75) return "gibbosaCalante";
  return "calante";
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
  const t = useTranslations("soleLuna");
  const locale = useLocale();

  useEffect(() => {
    setDati(calcolaOggi());
    const id = setInterval(() => setDati(calcolaOggi()), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // undefined = non ancora calcolato (primo render, prima dell'effetto);
  // null = calcolato ma con un evento assente (non capita mai in FVG).
  if (dati === undefined) {
    return <p className="text-ink-faint text-sm font-mono">{t("calcoloInCorso")}</p>;
  }
  if (dati === null) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        {t("calcoloNonDisponibile")}
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mb-3.5">
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">{t("albeggio")}</div>
          <div className="font-cond font-bold text-[24px] leading-none">{formattaOra(dati.albeggio, locale)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">{t("alba")}</div>
          <div className="font-cond font-bold text-[24px] leading-none text-warm">{formattaOra(dati.alba, locale)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">{t("tramonto")}</div>
          <div className="font-cond font-bold text-[24px] leading-none text-warm">{formattaOra(dati.tramonto, locale)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase text-ink-faint mb-1">{t("crepuscolo")}</div>
          <div className="font-cond font-bold text-[24px] leading-none">{formattaOra(dati.crepuscolo, locale)}</div>
        </div>
      </div>

      <div className="border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink-dim">
            <IconaLuna fase={dati.faseLuna} />
            <span className="text-sm">{t(`faseLuna.${chiaveFaseLunare(dati.faseLuna)}`)}</span>
          </div>
          <span className="font-mono text-xs text-ink-faint">
            {t("illuminata", { pct: Math.round(dati.illuminazione * 100) })}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 font-mono text-xs text-ink-faint">
          <span>
            {t("sorge")} <span className="text-ink-dim">{dati.sorgeLuna ? formattaOra(dati.sorgeLuna, locale) : t("nonOggi")}</span>
          </span>
          <span>
            {t("tramonta")}{" "}
            <span className="text-ink-dim">{dati.tramontaLuna ? formattaOra(dati.tramontaLuna, locale) : t("nonOggi")}</span>
          </span>
        </div>

        {(!dati.sorgeLuna || !dati.tramontaLuna) && (
          <p className="text-ink-faint text-[10px] font-mono mt-1.5">
            {t("noteSorgeTramontaMancante")}
          </p>
        )}
      </div>

      <p className="text-ink-faint text-[10px] font-mono mt-3">
        {t("riferimento")}
      </p>
    </div>
  );
}
