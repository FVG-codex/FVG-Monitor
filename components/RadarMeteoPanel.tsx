"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RadarData = { immagine: string; aggiornato_al: string };

export function RadarMeteoPanel() {
  const [dati, setDati] = useState<RadarData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "radar:fossalon")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as RadarData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 10 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento radar…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Immagine radar non disponibile al momento.</p>;
  }

  return (
    <div>
      <div className="rounded overflow-hidden bg-panel-alt flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dati.immagine} alt="Radar meteo — intensità pioggia" className="max-w-full" />
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Intensità pioggia (mm) · radar Fossalon · aggiornato {dati.aggiornato_al} · fonte: Protezione Civile FVG
        (CC BY 4.0)
      </p>
    </div>
  );
}
