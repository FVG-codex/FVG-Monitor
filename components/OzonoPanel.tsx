"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type DatoProvincia = {
  stazione: string;
  media_mobile_8h_max: number | null;
  superamento: boolean | null;
  dati_insufficienti: boolean;
};

type OzonoData = {
  data_misura: string;
  soglia_ugm3: number;
  per_provincia: Partial<Record<ProvinciaSlug, DatoProvincia>>;
};

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function OzonoPanel() {
  const [dati, setDati] = useState<OzonoData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "aria:ozono")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as OzonoData);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento ozono…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati ozono non disponibili al momento.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PROVINCE_LIST.map((p) => {
          const d = dati.per_provincia[p.slug];
          const superamento = d?.superamento;
          return (
            <div key={p.slug} className="flex-1 min-w-[72px] border border-line rounded p-2 text-center">
              <div className="font-cond font-semibold text-xs mb-1">{p.nome}</div>
              {d && d.media_mobile_8h_max !== null ? (
                <>
                  <div
                    className={`font-mono font-bold text-lg ${
                      superamento ? "text-allerta-rossa" : "text-allerta-verde"
                    }`}
                  >
                    {d.media_mobile_8h_max}
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
        Ozono, media mobile 8h max del {formattaData(dati.data_misura)} — soglia di legge{" "}
        {dati.soglia_ugm3} µg/m³ · fonte: ARPA FVG
      </p>
    </div>
  );
}
