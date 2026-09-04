"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProvinciaSlug } from "@/lib/province";

type FiumeData = {
  stazione: string;
  fiume: string;
  aggiornato_al: string;
  livello_m: number;
};

export function FiumePanel({ provincia }: { provincia: ProvinciaSlug }) {
  const [dati, setDati] = useState<FiumeData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `fiume:${provincia}`)
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const dati = data.data as FiumeData;
      // arrotondato anche qui come protezione in più, oltre allo
      // script di ingestione
      setDati({ ...dati, livello_m: Math.round(dati.livello_m * 100) / 100 });
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [provincia]);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento livello fiume…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati livello fiume non disponibili al momento.</p>;
  }

  return (
    <div>
      <div className="font-cond font-bold text-[36px] leading-[0.9]">
        {dati.livello_m}
        <span className="text-ink-dim text-sm ml-1">m</span>
      </div>
      <div className="font-mono text-xs text-cool-ink mt-1 mb-3">{dati.fiume.toUpperCase()}</div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3">
        <span>Stazione {dati.stazione}</span>
        <span>{dati.aggiornato_al}</span>
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Fonte: Protezione Civile FVG (CC BY 4.0)
      </p>
    </div>
  );
}
