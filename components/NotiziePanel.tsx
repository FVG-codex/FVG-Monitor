"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

type NotiziaItem = { titolo: string; link: string; data: string };
type NotizieData = { fonte: string; fonte_url: string; items: NotiziaItem[] };

// Multilingua (05/10/2026): tempo relativo tradotto riusando le stesse
// chiavi già create per NotizieProvinciaPage.tsx (namespace
// `notizieProvincia`, testo identico carattere-per-carattere) — la
// funzione resta qui perché calcola solo la categoria (min/ore/giorni),
// il testo arriva da `t()` nel componente sotto.
function tempoRelativoChiave(dataStr: string): { chiave: "minFa" | "oreFa" | "giorniFa"; n: number } {
  const diffMs = Date.now() - new Date(dataStr).getTime();
  const minuti = Math.floor(diffMs / 60000);
  if (minuti < 60) return { chiave: "minFa", n: minuti };
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return { chiave: "oreFa", n: ore };
  return { chiave: "giorniFa", n: Math.floor(ore / 24) };
}

export function NotiziePanel() {
  const [dati, setDati] = useState<NotizieData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("notizieProvincia");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "notizie:ansa-fvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as NotizieData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">{t("caricamentoNotizie")}</p>;
  }
  if (stato === "error" || !dati || dati.items.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">{t("notizieNonDisponibili")}</p>;
  }

  return (
    <div>
      {dati.items.slice(0, 5).map((n, i) => {
        const rel = tempoRelativoChiave(n.data);
        return (
          <div key={n.link} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="text-ink text-[15px] leading-snug mb-1.5 hover:text-cool-ink transition-colors">
                {n.titolo}
                <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
              </div>
            </a>
            <div className="flex gap-2 items-center font-mono text-[10px] text-ink-faint uppercase tracking-wide">
              <span className="text-warm">{dati.fonte}</span>
              <span>· {t(rel.chiave, { n: rel.n })}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
