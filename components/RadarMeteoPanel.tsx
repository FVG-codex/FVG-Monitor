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

type ProdottoRadar = {
  immagine: string;
  extent: [number, number, number, number] | null; // [minLon, maxLat, maxLon, minLat]
  aggiornato_al: string;
};

type RadarData = Partial<Record<"srtlbm_1" | "ssi" | "hmc" | "lbm_v", ProdottoRadar>>;

const PRODOTTI = [
  {
    chiave: "srtlbm_1" as const,
    label: "Pioggia",
    unita: "mm",
    spiegazione: "Intensità della pioggia in corso — più il colore è intenso (verso il rosso/viola), più forte è la precipitazione.",
  },
  {
    chiave: "ssi" as const,
    label: "Severità",
    unita: null,
    spiegazione: "Indice sintetico di severità del temporale (Storm Severity Index), da moderato a molto forte — pensato per una lettura rapida.",
  },
  {
    chiave: "hmc" as const,
    label: "Idrometeore",
    unita: null,
    spiegazione: "Tipo di precipitazione rilevata: pioggia leggera/moderata/forte, grandine, neve secca o bagnata, cristalli di ghiaccio.",
  },
  {
    chiave: "lbm_v" as const,
    label: "Vento Doppler",
    unita: "m/s",
    spiegazione: "Velocità del vento in quota rilevata dal radar — utile per individuare rotazione nelle celle temporalesche (dato più tecnico).",
  },
];

export function RadarMeteoPanel() {
  const [dati, setDati] = useState<RadarData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [prodotto, setProdotto] = useState<(typeof PRODOTTI)[number]["chiave"]>("srtlbm_1");

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
    return <p className="text-ink-faint text-sm font-mono">Dati radar non disponibili al momento.</p>;
  }

  const attivo = PRODOTTI.find((p) => p.chiave === prodotto)!;
  const corrente = dati[prodotto];

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {PRODOTTI.map((p) => (
          <button
            key={p.chiave}
            onClick={() => setProdotto(p.chiave)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              prodotto === p.chiave ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-ink-dim text-xs mb-3">{attivo.spiegazione}</p>

      {!corrente ? (
        <p className="text-ink-faint text-sm font-mono">Dati "{attivo.label}" non disponibili al momento.</p>
      ) : !corrente.extent ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={corrente.immagine} alt={`Radar meteo — ${attivo.label}`} className="max-w-full rounded" />
          <p className="text-ink-faint text-[10px] font-mono mt-2">
            Aggiornato {corrente.aggiornato_al} · fonte: Protezione Civile FVG (CC BY 4.0)
          </p>
        </div>
      ) : (
        (() => {
          const [minLon, maxLat, maxLon, minLat] = corrente.extent;
          const bounds: [[number, number], [number, number]] = [
            [minLat, minLon],
            [maxLat, maxLon],
          ];
          const centro: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
          return (
            <div>
              <div className="rounded overflow-hidden" style={{ height: 320 }}>
                <RadarMeteoMap immagine={corrente.immagine} bounds={bounds} centro={centro} />
              </div>
              <p className="text-ink-faint text-[10px] font-mono mt-2">
                {attivo.label}
                {attivo.unita ? ` (${attivo.unita})` : ""} · radar Fossalon · aggiornato {corrente.aggiornato_al} ·
                fonte: Protezione Civile FVG (CC BY 4.0) · mappa: © OpenStreetMap
              </p>
            </div>
          );
        })()
      )}
    </div>
  );
}
