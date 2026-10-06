"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { intlLocale } from "@/lib/intlLocale";

type Trimestre = { periodo: string; valore: number };
type EconomiaDisoccupazioneData = { trimestri: Trimestre[]; fonte: string; aggiornato_al: string };

function formattaPercentuale(v: number, locale: string): string {
  return v.toLocaleString(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

// Pannello "Disoccupazione FVG" — prima sezione Economia del sito
// (10/09/2026). Dato trimestrale ISTAT (dataflow SDMX 151_914, area
// ITD4 = Friuli Venezia Giulia), aggiornato con ~1 trimestre di ritardo:
// molto più lento degli altri pannelli del sito, per questo qui mostriamo
// lo storico degli ultimi trimestri invece del solo ultimo valore — un
// numero isolato, aggiornato 4 volte l'anno, sarebbe poco leggibile senza
// il confronto con i trimestri precedenti. Vedi ingestEconomiaDisoccupazione()
// in scripts/ingest-light.mjs per la query SDMX e la verifica fatta contro
// un campione reale della risposta XML prima di scrivere il parsing.
export function EconomiaDisoccupazionePanel() {
  const [dati, setDati] = useState<EconomiaDisoccupazioneData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("economia");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  // Multilingua (06/10/2026): replica localmente — invece di una
  // funzione separata — la formattazione "{trim}° trim. {anno}" come
  // chiamata a t("etichettaTrimestre", {...}), stesso principio già
  // usato altrove nel progetto per non lasciare testo italiano fisso
  // fuori da messages/*.json.
  function etichettaTrimestre(periodo: string): string {
    const [anno, trim] = periodo.split("-Q");
    return t("etichettaTrimestre", { trim, anno });
  }

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "economia:disoccupazione-fvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as EconomiaDisoccupazioneData);
      setStato("ready");
    }
    carica();
    // Dato trimestrale: un ricontrollo ogni 15 minuti come gli altri
    // pannelli non avrebbe senso, ma non costa nulla riusare lo stesso
    // intervallo — la query a Supabase è comunque leggera, e il valore
    // cambia sul server solo ogni run di ingest-light.mjs (ogni 15 min),
    // non più spesso di così.
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>;
  }
  if (stato === "error" || !dati || dati.trimestri.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>;
  }

  const trimestri = dati.trimestri;
  const ultimo = trimestri[trimestri.length - 1];
  const precedente = trimestri.length > 1 ? trimestri[trimestri.length - 2] : null;
  const delta = precedente ? ultimo.valore - precedente.valore : null;

  const storico = trimestri.slice(-8).reverse();
  const massimo = Math.max(...storico.map((trim) => trim.valore));

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-cond font-bold text-4xl">{formattaPercentuale(ultimo.valore, locale)}</span>
        {delta !== null && (
          <span
            className={`font-mono text-xs ${
              delta > 0 ? "text-allerta-rossa-ink" : delta < 0 ? "text-allerta-verde-ink" : "text-ink-faint"
            }`}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "="}{" "}
            {Math.abs(delta).toLocaleString(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
            {t("puntiTrimestrePrecedente")}
          </span>
        )}
      </div>
      <p className="text-ink-faint text-xs font-mono mb-4">
        {t("tassoDisoccupazioneSottotitolo", { trimestre: etichettaTrimestre(ultimo.periodo) })}
      </p>

      <p className="font-cond font-semibold text-[11px] tracking-[0.09em] uppercase text-ink-dim mb-2">
        {t("ultimiTrimestri")}
      </p>
      <div>
        {storico.map((trim, i) => (
          <div key={trim.periodo} className={`flex items-center gap-2 py-1.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="font-mono text-[11px] text-ink-faint w-24 flex-shrink-0">
              {etichettaTrimestre(trim.periodo)}
            </span>
            <div className="flex-1 bg-panel-alt rounded-sm h-2 overflow-hidden">
              <div
                className="h-full bg-cool"
                style={{ width: `${massimo > 0 ? (trim.valore / massimo) * 100 : 0}%` }}
              />
            </div>
            <span className="font-mono text-xs w-12 text-right flex-shrink-0">{formattaPercentuale(trim.valore, locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
