"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProvinciaSlug } from "@/lib/province";

type PioggiaData = {
  stazione: string;
  aggiornato_al: string;
  pioggia_1h_mm: number | null;
  pioggia_24h_mm: number | null;
};

export function PioggiaPanel({ provincia = "trieste" }: { provincia?: ProvinciaSlug }) {
  const [dati, setDati] = useState<PioggiaData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `pioggia:${provincia}`)
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as PioggiaData);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento dati pioggia…</p>;
  }
  if (stato === "error" || !dati || (dati.pioggia_1h_mm === null && dati.pioggia_24h_mm === null)) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        Dati pioggia non disponibili per questa stazione al momento.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-6 mb-1">
        <div>
          <div className="font-cond font-bold text-[36px] leading-[0.9]">
            {dati.pioggia_1h_mm ?? "—"}
            <span className="text-ink-dim text-sm ml-1">mm</span>
          </div>
          <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">Ultima ora</div>
        </div>
        <div>
          <div className="font-cond font-bold text-[36px] leading-[0.9]">
            {dati.pioggia_24h_mm ?? "—"}
            <span className="text-ink-dim text-sm ml-1">mm</span>
          </div>
          <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">Ultime 24h</div>
        </div>
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3 mt-3">
        <span>Stazione {dati.stazione}</span>
        <span>{dati.aggiornato_al}</span>
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Fonte: Protezione Civile FVG (CC BY 4.0)
      </p>
    </div>
  );
}
