"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProvinciaSlug } from "@/lib/province";

export function TemperaturaBadge({
  provincia,
  size = "sm",
}: {
  provincia: ProvinciaSlug;
  size?: "sm" | "lg";
}) {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `temperatura:${provincia}`)
        .single();
      if (!attivo || error || !data) return;
      const d = data.data as { temperatura_c: number };
      // arrotondato anche qui come protezione in più, oltre allo
      // script di ingestione — non deve mai arrivare a schermo un
      // numero con troppi decimali
      setTemp(Math.round(d.temperatura_c * 10) / 10);
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [provincia]);

  // Fallisce silenziosamente se il dato non c'è — è un arricchimento,
  // non un contenuto essenziale (l'assenza non deve mostrare un errore)
  if (temp === null) return null;

  if (size === "lg") {
    return (
      <div className="font-cond font-bold text-[32px] leading-none flex items-center gap-2">
        {temp}
        <span className="text-ink-dim text-base">°C ora</span>
      </div>
    );
  }

  // flex-shrink-0 + whitespace-nowrap: questo badge viene quasi sempre
  // usato dentro una riga flex accanto ad altro testo di larghezza
  // variabile (es. MeteoPanel.tsx) — senza queste due classi il valore
  // può andare a capo o restringersi in modo illeggibile su schermi
  // stretti (stesso bug flexbox già documentato più volte nel progetto).
  return <span className="font-mono text-cool text-xs flex-shrink-0 whitespace-nowrap">{temp}°C</span>;
}
