"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VentoData = {
  stazione: string;
  aggiornato_al: string;
  velocita_kmh: number | null;
  raffica_kmh: number | null;
  direzione_gradi: number | null;
  direzione_raffica_gradi: number | null;
};

// Converte i gradi in punto cardinale, più leggibile di un numero nudo
function puntoCardinale(gradi: number | null): string {
  if (gradi === null) return "—";
  const punti = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return punti[Math.round(gradi / 45) % 8];
}

export function VentoPanel() {
  const [dati, setDati] = useState<VentoData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data, updated_at")
        .eq("id", "vento:trieste")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as VentoData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento dati vento…</p>;
  }
  if (stato === "error" || !dati || dati.velocita_kmh === null) {
    return <p className="text-ink-faint text-sm font-mono">Dati vento non disponibili al momento.</p>;
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-cond font-bold text-[52px] leading-[0.9]">{dati.velocita_kmh}</span>
        <span className="text-ink-dim text-sm">km/h</span>
      </div>
      <div className="font-mono text-xs text-cool mb-4">
        DA {puntoCardinale(dati.direzione_gradi)} · STAZIONE {dati.stazione.toUpperCase()}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3">
        <span>
          raffica max {dati.raffica_kmh ?? "—"} km/h
          {dati.direzione_raffica_gradi !== null && ` (${puntoCardinale(dati.direzione_raffica_gradi)})`}
        </span>
        <span>{dati.aggiornato_al}</span>
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Fonte: Protezione Civile FVG (CC BY 4.0)
      </p>
    </div>
  );
}
