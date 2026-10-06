"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

type Volo = { volo: string; luogo: string; previsto: string; effettivo: string; note: string };
type VoliData = { partenze: Volo[]; arrivi: Volo[]; aggiornato_al_testo: string };

export function VoliPanel() {
  const [dati, setDati] = useState<VoliData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<"partenze" | "arrivi">("partenze");
  const t = useTranslations("voli");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "voli:trieste-airport")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as VoliData);
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
    return <p className="text-ink-faint text-sm font-mono">{t("caricamento")}</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>;
  }

  const voli = dati[tab];

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(["partenze", "arrivi"] as const).map((chiave) => (
          <button
            key={chiave}
            onClick={() => setTab(chiave)}
            aria-pressed={tab === chiave}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              tab === chiave ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t(chiave)}
          </button>
        ))}
      </div>

      {voli.length === 0 ? (
        <p className="text-ink-faint text-sm font-mono">{t("nessunVolo")}</p>
      ) : (
        <div>
          {voli.slice(0, 6).map((v, i) => {
            const ritardo = v.previsto && v.effettivo && v.previsto !== v.effettivo;
            return (
              <div key={i} className={`flex items-center gap-3 py-2 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="font-mono text-xs text-ink-faint w-16 flex-shrink-0">{v.volo}</span>
                <span className="text-ink flex-1 min-w-0 truncate">{v.luogo}</span>
                <span className={`font-mono text-xs flex-shrink-0 ${ritardo ? "text-warm" : "text-ink-dim"}`}>
                  {v.effettivo || v.previsto}
                  {/* "rit." testuale, non solo il colore (Fase 4 —
                      Accessibilità, 24/08/2026, WCAG 1.4.1 Use of Color):
                      prima il ritardo era indicato SOLO dal colore
                      dell'orario — invisibile a chi non percepisce quel
                      colore (es. daltonici, schermo in scala di grigi). */}
                  {ritardo && <span className="ml-1 lowercase">{t("ritardo")}</span>}
                </span>
                {v.note && (
                  <span className="text-cool-ink text-[10px] font-mono flex-shrink-0 hidden sm:inline">{v.note}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-ink-faint text-[10px] font-mono mt-3 border-t border-line pt-2">
        {t("ultimoAggiornamento", { testo: dati.aggiornato_al_testo || "—" })}
      </p>
    </div>
  );
}
