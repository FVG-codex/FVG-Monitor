"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Trimestre = { periodo: string; valore: number };
type EconomiaDisoccupazioneData = { trimestri: Trimestre[]; fonte: string; aggiornato_al: string };

function etichettaTrimestre(periodo: string): string {
  const [anno, trim] = periodo.split("-Q");
  return `${trim}° trim. ${anno}`;
}

function formattaPercentuale(v: number): string {
  return v.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento…</p>;
  }
  if (stato === "error" || !dati || dati.trimestri.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>;
  }

  const trimestri = dati.trimestri;
  const ultimo = trimestri[trimestri.length - 1];
  const precedente = trimestri.length > 1 ? trimestri[trimestri.length - 2] : null;
  const delta = precedente ? ultimo.valore - precedente.valore : null;

  const storico = trimestri.slice(-8).reverse();
  const massimo = Math.max(...storico.map((t) => t.valore));

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-cond font-bold text-4xl">{formattaPercentuale(ultimo.valore)}</span>
        {delta !== null && (
          <span
            className={`font-mono text-xs ${
              delta > 0 ? "text-allerta-rossa-ink" : delta < 0 ? "text-allerta-verde-ink" : "text-ink-faint"
            }`}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
            punti sul trimestre prec.
          </span>
        )}
      </div>
      <p className="text-ink-faint text-xs font-mono mb-4">
        Tasso di disoccupazione, {etichettaTrimestre(ultimo.periodo)} — Friuli Venezia Giulia, 15-74 anni
      </p>

      <p className="font-cond font-semibold text-[11px] tracking-[0.09em] uppercase text-ink-dim mb-2">
        Ultimi trimestri
      </p>
      <div>
        {storico.map((t, i) => (
          <div key={t.periodo} className={`flex items-center gap-2 py-1.5 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="font-mono text-[11px] text-ink-faint w-24 flex-shrink-0">
              {etichettaTrimestre(t.periodo)}
            </span>
            <div className="flex-1 bg-panel-alt rounded-sm h-2 overflow-hidden">
              <div
                className="h-full bg-cool"
                style={{ width: `${massimo > 0 ? (t.valore / massimo) * 100 : 0}%` }}
              />
            </div>
            <span className="font-mono text-xs w-12 text-right flex-shrink-0">{formattaPercentuale(t.valore)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
