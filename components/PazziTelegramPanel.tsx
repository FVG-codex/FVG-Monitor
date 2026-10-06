"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

type MessaggioTelegram = { id: string; testo: string; data: string | null; link: string };
type PazziTelegramData = { fonte: string; fonte_url: string; messaggi: MessaggioTelegram[] };

// Multilingua (06/10/2026): stesso pattern di PazziPrevisioniPanel.tsx —
// chiave stabile + numero, tradotta riusando notizieProvincia.minFa/oreFa/giorniFa.
function tempoRelativoChiave(dataStr: string): { chiave: "minFa" | "oreFa" | "giorniFa"; n: number } {
  const diffMs = Date.now() - new Date(dataStr).getTime();
  const minuti = Math.floor(diffMs / 60000);
  if (minuti < 60) return { chiave: "minFa", n: minuti };
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return { chiave: "oreFa", n: ore };
  return { chiave: "giorniFa", n: Math.floor(ore / 24) };
}

// Pannello "Pazzi per il meteo" (canale Telegram) — sessione 09/09/2026.
// Mostra gli ultimi messaggi dell'anteprima pubblica del canale Telegram
// (nessun login richiesto, https://t.me/s/<canale>). Nota: i selettori
// cheerio usati in ingest-light.mjs sono basati sulla struttura nota e
// stabile del widget pubblico Telegram, non su outerHTML reale verificato
// per QUESTO canale — se in futuro il pannello risultasse vuoto pur con
// il canale attivo, verificare prima il markup reale.
export function PazziTelegramPanel() {
  const [dati, setDati] = useState<PazziTelegramData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const tPazzi = useTranslations("pazzi");
  const tNotizie = useTranslations("notizieProvincia");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "meteo:pazzi-telegram")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as PazziTelegramData);
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
    return <p className="text-ink-faint text-sm font-mono">{tPazzi("caricamentoAggiornamenti")}</p>;
  }
  if (stato === "error" || !dati || dati.messaggi.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">{tPazzi("aggiornamentiNonDisponibili")}</p>;
  }

  return (
    <div>
      {dati.messaggi.slice(0, 5).map((m, i) => {
        const rel = m.data ? tempoRelativoChiave(m.data) : null;
        return (
          <div key={m.id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
            <a href={m.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="text-ink text-[15px] leading-snug mb-1.5 hover:text-cool-ink transition-colors whitespace-pre-line">
                {m.testo}
                <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
              </div>
            </a>
            {rel && (
              <div className="flex gap-2 items-center font-mono text-[10px] text-ink-faint uppercase tracking-wide">
                <span className="text-warm">Telegram</span>
                <span>· {tNotizie(rel.chiave, { n: rel.n })}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
