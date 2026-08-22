"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PrezzoCarburante = { prezzo_medio_eur_litro: number; erogazione: "self" | "servito" };

type CarburantiData = {
  carburanti: Partial<Record<"benzina" | "gasolio" | "gpl", PrezzoCarburante>>;
  aggiornato_al: string | null;
};

const CARBURANTI_LABEL: { chiave: "benzina" | "gasolio" | "gpl"; label: string }[] = [
  { chiave: "benzina", label: "Benzina" },
  { chiave: "gasolio", label: "Gasolio" },
  { chiave: "gpl", label: "GPL" },
];

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export function CarburantiPanel() {
  const [dati, setDati] = useState<CarburantiData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "carburanti")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as CarburantiData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 60 * 60 * 1000); // il dato si aggiorna una volta al giorno
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento prezzi carburante…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati prezzi carburante non disponibili al momento.</p>;
  }

  const disponibili = CARBURANTI_LABEL.filter((c) => dati.carburanti[c.chiave]);

  return (
    <div>
      <div className="flex gap-6 mb-1 flex-wrap">
        {disponibili.map((c) => {
          const p = dati.carburanti[c.chiave]!;
          return (
            <div key={c.chiave}>
              <div className="font-cond font-bold text-[36px] leading-[0.9]">
                {p.prezzo_medio_eur_litro.toFixed(3)}
                <span className="text-ink-dim text-sm ml-1">€/l</span>
              </div>
              <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">
                {c.label} · {p.erogazione}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3 mt-3">
        <span>Media regionale FVG</span>
        <span>{dati.aggiornato_al ? formattaData(dati.aggiornato_al) : "—"}</span>
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Fonte: MIMIT — Osservatorio Prezzi Carburanti (aggiornato ogni mattina alle 8:00)
      </p>
    </div>
  );
}
