"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ZoneChip } from "@/components/ZoneChip";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type DatoProvincia = { zona: "A" | "B" | "C" | "D" | null; livelloMax: number };
type AllertaData = { per_provincia: Partial<Record<ProvinciaSlug, DatoProvincia>> };

const NOME_LIVELLO = ["Verde", "Gialla", "Arancione", "Rossa"];

export function AllertaZonePanel() {
  const [dati, setDati] = useState<AllertaData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "allerta:overview")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as AllertaData);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento allerte…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati allerte non disponibili al momento.</p>;
  }

  return (
    <div className="flex gap-1.5">
      {PROVINCE_LIST.map((p) => {
        const d = dati.per_provincia[p.slug];
        return (
          <div key={p.slug} className="flex-1 border border-line rounded p-2 text-center">
            {d?.zona ? <ZoneChip zone={d.zona} size="md" /> : <span className="text-ink-faint text-xs">—</span>}
            <div className="font-mono text-[9px] uppercase text-ink-faint mt-1.5">{p.nome}</div>
            <div className="font-mono text-[9px] uppercase text-ink-faint">
              {d ? NOME_LIVELLO[d.livelloMax] ?? "Verde" : "n.d."}
            </div>
          </div>
        );
      })}
    </div>
  );
}
