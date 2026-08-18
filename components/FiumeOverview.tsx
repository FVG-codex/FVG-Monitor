"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type FiumeData = { stazione: string; fiume: string; aggiornato_al: string; livello_m: number };

export function FiumeOverview() {
  const [datiPerProvincia, setDatiPerProvincia] = useState<Partial<Record<ProvinciaSlug, FiumeData>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const ids = PROVINCE_LIST.map((p) => `fiume:${p.slug}`);
      const { data, error } = await supabase.from("snapshots").select("id, data").in("id", ids);
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const mappa: Partial<Record<ProvinciaSlug, FiumeData>> = {};
      for (const row of data) {
        const slug = row.id.replace("fiume:", "") as ProvinciaSlug;
        mappa[slug] = row.data as FiumeData;
      }
      setDatiPerProvincia(mappa);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento livelli fiumi…</p>;
  }
  if (stato === "error" || Object.keys(datiPerProvincia).length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Dati livelli fiumi non disponibili al momento.</p>;
  }

  return (
    <div className="flex gap-1.5">
      {PROVINCE_LIST.map((p) => {
        const d = datiPerProvincia[p.slug];
        return (
          <div key={p.slug} className="flex-1 border border-line rounded p-2 text-center">
            <div className="font-cond font-semibold text-xs mb-1">{p.nome}</div>
            {d ? (
              <>
                <div className="font-mono font-bold text-lg text-ink">{d.livello_m}</div>
                <div className="font-mono text-[9px] text-ink-faint">m · {d.fiume}</div>
              </>
            ) : (
              <div className="font-mono text-xs text-ink-faint">n.d.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
