"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { TopHeader } from "@/components/TopHeader";
import { Panel } from "@/components/Panel";

const TerremotiMap = dynamic(() => import("@/components/TerremotiMap").then((m) => m.TerremotiMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

type Evento = {
  id: number;
  data: string;
  magnitudo: number;
  tipoMagnitudo: string;
  luogo: string;
  lat: number;
  lon: number;
  profonditaKm: number;
};

type TerremotiData = { eventi: Evento[]; aggiornato_al: string };

function formattaData(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TerremotiPage() {
  const [dati, setDati] = useState<TerremotiData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "terremoti:fvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as TerremotiData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const eventiOrdinati = dati
    ? dati.eventi.slice().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    : [];

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Terremoti</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Eventi sismici in FVG e zone limitrofe, ultimi 30 giorni — fonte: INGV (Istituto Nazionale di Geofisica
          e Vulcanologia)
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
            <Panel title="Mappa">
              {/* role="region" + aria-label (Fase 4 — Accessibilità,
                  24/08/2026): la mappa Leaflet dietro questo div non è
                  navigabile in modo significativo con uno screen reader —
                  gli stessi dati sono comunque disponibili per intero,
                  in forma testuale, nel pannello "Elenco eventi" qui
                  accanto. L'etichetta evita solo che la regione risulti
                  anonima. */}
              <div
                role="region"
                aria-label="Mappa dei terremoti in Friuli Venezia Giulia — elenco testuale equivalente nel pannello a fianco"
                style={{ height: 420 }}
                className="rounded overflow-hidden"
              >
                <TerremotiMap eventi={eventiOrdinati} centro={[46.1, 13.1]} />
              </div>
            </Panel>

            <Panel title={`Elenco eventi (${eventiOrdinati.length})`}>
              {eventiOrdinati.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessun evento negli ultimi 30 giorni.</p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  {eventiOrdinati.map((e, i) => (
                    <div key={e.id} className={`py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-cond font-bold text-lg">M{e.magnitudo.toFixed(1)}</span>
                        <span className="font-mono text-[10px] text-ink-faint">{formattaData(e.data)}</span>
                      </div>
                      <div className="text-ink-dim text-sm">{e.luogo}</div>
                      <div className="font-mono text-[10px] text-ink-faint">
                        Profondità {e.profonditaKm.toFixed(1)} km
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
