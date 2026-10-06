"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

type VocePrevisione = {
  titolo: string;
  link: string;
  data: string;
  autore: string | null;
  estratto: string | null;
};
type PazziPrevisioniData = { fonte: string; fonte_url: string; items: VocePrevisione[] };

// Multilingua (06/10/2026): stessa logica di tempoRelativo() in
// NotiziePanel.tsx (prima della sua conversione) — restituisce una
// chiave stabile + il numero invece del testo italiano diretto, tradotta
// sotto riusando le chiavi esistenti notizieProvincia.minFa/oreFa/giorniFa
// (stesso identico testo, nessuna nuova chiave necessaria).
function tempoRelativoChiave(dataStr: string): { chiave: "minFa" | "oreFa" | "giorniFa"; n: number } {
  const diffMs = Date.now() - new Date(dataStr).getTime();
  const minuti = Math.floor(diffMs / 60000);
  if (minuti < 60) return { chiave: "minFa", n: minuti };
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return { chiave: "oreFa", n: ore };
  return { chiave: "giorniFa", n: Math.floor(ore / 24) };
}

// Pannello "Previsioni temporalesche" — sessione 09/09/2026. Fonte: feed
// RSS della categoria dedicata sul sito WordPress "Pazzi per il meteo
// Goriziano". Mostra solo titolo+link+data+estratto (troncato
// automaticamente da WordPress, mai l'articolo completo) — il sito ha un
// avviso di copyright esplicito in fondo pagina, stessa cautela già
// applicata al modulo Notizie.
export function PazziPrevisioniPanel() {
  const [dati, setDati] = useState<PazziPrevisioniData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("meteo");
  const tNotizie = useTranslations("notizieProvincia");
  const tPazzi = useTranslations("pazzi");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "meteo:pazzi-previsioni")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as PazziPrevisioniData);
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
    return <p className="text-ink-faint text-sm font-mono">{t("caricamentoPrevisioni")}</p>;
  }
  if (stato === "error" || !dati || dati.items.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">{t("previsioniNonDisponibili")}</p>;
  }

  return (
    <div>
      {dati.items.slice(0, 4).map((v, i) => {
        const rel = tempoRelativoChiave(v.data);
        return (
          <div key={v.link} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
            <a href={v.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="text-ink text-[15px] leading-snug mb-1.5 hover:text-cool-ink transition-colors">
                {v.titolo}
                <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
              </div>
            </a>
            {v.estratto && <p className="text-ink-dim text-[13px] leading-snug mb-1.5">{v.estratto}</p>}
            <div className="flex flex-wrap gap-x-2 gap-y-1 items-center justify-between font-mono text-[10px] text-ink-faint uppercase tracking-wide">
              <span className="flex gap-2 items-center">
                {v.autore && <span className="text-warm">{v.autore}</span>}
                <span>· {tNotizie(rel.chiave, { n: rel.n })}</span>
              </span>
              <a
                href={v.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-faint hover:text-cool-ink transition-colors normal-case tracking-normal"
              >
                {tPazzi("leggiCompleta")}
                <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
