"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ZoneChip } from "@/components/ZoneChip";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { fetchTutteLeAllerte, type EsitoProvincia } from "@/lib/allerte";

// Chiavi stabili (non testo), tradotte in messages/*.json sotto
// `allerte.livelli.<chiave>` — vedi `t(\`livelli.${LIVELLO_KEYS[livelloMax]}\`)`
// sotto (05/10/2026, stesso schema già usato altrove nel progetto per
// un array a livello di modulo che non deve contenere testo diretto).
const LIVELLO_KEYS = ["verde", "gialla", "arancione", "rossa"];

export function AllertaZonePanel() {
  const [dati, setDati] = useState<Partial<Record<ProvinciaSlug, EsitoProvincia>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("allerte");
  const tChrome = useTranslations("chrome");

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
    return <p className="text-ink-faint text-sm font-mono">{t("caricamento")}</p>;
  }
  if (stato === "error" || Object.keys(dati).length === 0) {
    return <p className="text-ink-faint text-sm font-mono">{t("datiNonDisponibili")}</p>;
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
              {d ? t(`livelli.${LIVELLO_KEYS[livelloMax] ?? "verde"}`) : tChrome("nd")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
