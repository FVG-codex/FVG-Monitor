"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

// Leaflet richiede il DOM del browser (window/document) — niente
// rendering lato server, va caricato dinamicamente solo lato client
const RadarMeteoMap = dynamic(() => import("@/components/RadarMeteoMap").then((m) => m.RadarMeteoMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

type RadarData = {
  immagine: string;
  extent: [number, number, number, number] | null; // [minLon, maxLat, maxLon, minLat]
  aggiornato_al: string;
};

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

  // Fallback se manca l'extent (non dovrebbe succedere, ma per sicurezza
  // mostriamo comunque l'immagine da sola invece di nascondere tutto)
  if (!dati.extent) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dati.immagine} alt="Radar meteo — intensità pioggia" className="max-w-full rounded" />
        <p className="text-ink-faint text-[10px] font-mono mt-2">
          Aggiornato {dati.aggiornato_al} · fonte: Protezione Civile FVG (CC BY 4.0)
        </p>
      </div>
    );
  }

  const [minLon, maxLat, maxLon, minLat] = dati.extent;
  const bounds: [[number, number], [number, number]] = [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
  const centro: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];

  return (
    <div>
      <div className="rounded overflow-hidden" style={{ height: 320 }}>
        <RadarMeteoMap immagine={dati.immagine} bounds={bounds} centro={centro} />
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        Intensità pioggia (mm) · radar Fossalon · aggiornato {dati.aggiornato_al} · fonte: Protezione Civile FVG
        (CC BY 4.0) · mappa: © OpenStreetMap
      </p>
    </div>
  );
}
