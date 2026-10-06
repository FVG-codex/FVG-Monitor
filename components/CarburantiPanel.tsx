"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { intlLocale } from "@/lib/intlLocale";

type PrezzoCarburante = { prezzo_medio_eur_litro: number; erogazione: "self" | "servito" };

type CarburantiData = {
  carburanti: Partial<Record<"benzina" | "gasolio" | "gpl", PrezzoCarburante>>;
  aggiornato_al: string | null;
};

// 05/10/2026: la label perde il testo diretto a favore della `chiave`
// stabile, tradotta sotto con `t(\`tipi.${c.chiave}\`)` — stesso schema
// già usato altrove nel progetto per un array a livello di modulo
// (es. CommercioPage.tsx/SanitaPage.tsx).
const CARBURANTI_CHIAVI: ("benzina" | "gasolio" | "gpl")[] = ["benzina", "gasolio", "gpl"];

function formattaData(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });
}

export function CarburantiPanel() {
  const [dati, setDati] = useState<CarburantiData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("carburanti");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "carburanti")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as CarburantiData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 60 * 60 * 1000); // il dato si aggiorna una volta al giorno
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">{t("caricamento")}</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>;
  }

  const disponibili = CARBURANTI_CHIAVI.filter((chiave) => dati.carburanti[chiave]);

  return (
    <div>
      <div className="flex gap-6 mb-1 flex-wrap">
        {disponibili.map((chiave) => {
          const p = dati.carburanti[chiave]!;
          return (
            <div key={chiave}>
              <div className="font-cond font-bold text-[36px] leading-[0.9]">
                {p.prezzo_medio_eur_litro.toFixed(3)}
                <span className="text-ink-dim text-sm ml-1">€/l</span>
              </div>
              <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">
                {t(`tipi.${chiave}`)} · {p.erogazione}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3 mt-3">
        <span>{t("mediaRegionale")}</span>
        <span>{dati.aggiornato_al ? formattaData(dati.aggiornato_al, locale) : "—"}</span>
      </div>
      <p className="text-ink-faint text-[10px] font-mono mt-2">
        {t("fonte")}
      </p>
    </div>
  );
}
