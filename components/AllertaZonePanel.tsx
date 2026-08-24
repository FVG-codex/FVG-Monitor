"use client";

import { useEffect, useState } from "react";
import { ZoneChip } from "@/components/ZoneChip";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { fetchTutteLeAllerte, type EsitoProvincia } from "@/lib/allerte";

const NOME_LIVELLO = ["Verde", "Gialla", "Arancione", "Rossa"];

export function AllertaZonePanel() {
  const [dati, setDati] = useState<Partial<Record<ProvinciaSlug, EsitoProvincia>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      try {
        const risultato = await fetchTutteLeAllerte();
        if (!attivo) return;
        setDati(risultato);
        setStato("ready");
      } catch {
        if (attivo) setStato("error");
      }
    }
    carica();
    const id = setInterval(carica, 10 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento allerte…</p>;
  }
  if (stato === "error" || Object.keys(dati).length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Dati allerte non disponibili al momento.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PROVINCE_LIST.map((p) => {
        const d = dati[p.slug];
        const livelloMax = d?.allerte[0]?.livello ?? 0;
        return (
          <div key={p.slug} className="flex-1 min-w-[72px] border border-line rounded p-2 text-center">
            {d?.zona ? <ZoneChip zone={d.zona} size="md" /> : <span className="text-ink-faint text-xs">—</span>}
            <div className="font-mono text-[9px] uppercase text-ink-faint mt-1.5">{p.nome}</div>
            <div className="font-mono text-[9px] uppercase text-ink-faint">
              {d ? NOME_LIVELLO[livelloMax] ?? "Verde" : "n.d."}
            </div>
          </div>
        );
      })}
    </div>
  );
}
