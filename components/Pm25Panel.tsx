"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type DatoProvincia = {
  stazione: string;
  media_giornaliera: number | null;
  superamento_oms: boolean | null;
  dati_insufficienti: boolean;
};

type Pm25Data = {
  data_misura: string;
  soglia_oms_ugm3: number;
  per_provincia: Partial<Record<ProvinciaSlug, DatoProvincia>>;
};

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function Pm25Panel() {
  const [dati, setDati] = useState<Pm25Data | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "aria:pm25")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as Pm25Data);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento PM2.5…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati PM2.5 non disponibili al momento.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PROVINCE_LIST.map((p) => {
          const d = dati.per_provincia[p.slug];
          const superamento = d?.superamento_oms;
          return (
            <div key={p.slug} className="flex-1 min-w-[72px] border border-line rounded p-2 text-center">
              <div className="font-cond font-semibold text-xs mb-1">{p.nome}</div>
              {d && d.media_giornaliera !== null ? (
                <>
                  <div
                    className={`font-mono font-bold text-lg ${
                      superamento ? "text-allerta-rossa" : "text-allerta-verde"
                    }`}
                  >
                    {d.media_giornaliera}
                  </div>
                  <div className="font-mono text-[9px] text-ink-faint">µg/m³</div>
                </>
              ) : (
                <div className="font-mono text-xs text-ink-faint">n.d.</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-ink-faint text-[10px] font-mono">
        PM2.5 media giornaliera del {formattaData(dati.data_misura)} — linea guida OMS 24h{" "}
        {dati.soglia_oms_ugm3} µg/m³ (l&apos;Italia fissa solo un limite annuale) · fonte: ARPA FVG
      </p>
    </div>
  );
}
