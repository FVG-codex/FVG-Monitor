"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { WebcamCard, type Webcam } from "@/components/WebcamCard";

type WebcamData = { webcam: Webcam[]; aggiornato_al: string };

const ZONE_AUTOSTRADE = new Set(["A4", "A23", "A28", "SR354"]);

export function ViabilitaPage() {
  const [dati, setDati] = useState<WebcamData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "webcam:osmer")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as WebcamData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 60 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const webcamAutostrade = (dati?.webcam ?? []).filter((w) => ZONE_AUTOSTRADE.has(w.zona));

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Viabilità</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Eventi di traffico e webcam autostradali — fonte: InfoViaggiando, OSMER ARPA FVG
        </p>

        <div className="mb-8">
          <Panel title="Eventi in corso" linkLabel="InfoViaggiando →" linkHref="https://infoviaggiando.it">
            <ViabilitaPanel />
          </Panel>
        </div>

        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mb-1">Webcam autostradali</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">
          A4, A23, A28, SR354 — fonte: OSMER ARPA FVG (CC BY-SA 3.0). Clicca per aprire la fonte originale
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}
        {stato === "ready" && webcamAutostrade.length === 0 && (
          <p className="text-ink-faint text-sm font-mono">Nessuna webcam autostradale disponibile.</p>
        )}

        {stato === "ready" && webcamAutostrade.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {webcamAutostrade.map((w, i) => (
              <WebcamCard key={i} webcam={w} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
