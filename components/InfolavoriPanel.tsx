"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

// Multilingua (06/10/2026): richiesta dell'utente — box "lavori in
// corso oggi" nella sezione Viabilità, a partire da
// fvgstrade.it/infolavori. Il filtro "attivi oggi" è già calcolato
// lato ingestione (vedi `ingestInfolavori()` in
// scripts/ingest-light.mjs per la logica di parsing delle date nel
// testo libero e i suoi limiti dichiarati) — questo componente mostra
// solo quanto arriva già filtrato nello snapshot.
//
// Titolo e testo del cantiere sono dati reali pubblicati da FVG
// Strade SpA: restano in italiano in ogni lingua, come tutti i dati
// da fonti esterne del sito (bollettini, notizie, orari, ecc.) — solo
// le etichette fisse del box sono tradotte.
type CantiereAttivo = {
  dataPubblicazione: string;
  titolo: string;
  testo: string;
  link: string | null;
  periodo: { inizio: string | null; fine: string | null };
};
type InfolavoriData = { attivi: CantiereAttivo[]; totaleSchede: number; aggiornato_al: string };

export function InfolavoriPanel() {
  const [dati, setDati] = useState<InfolavoriData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("viabilita");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "viabilita:infolavori")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as InfolavoriData);
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
  if (dati.attivi.length === 0) {
    return <p className="text-ink-dim text-sm">{t("nessunCantiere")}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {dati.attivi.map((c, i) => (
        <div key={c.link ?? i} className="border border-line rounded p-3">
          <div className="font-cond font-semibold text-sm uppercase tracking-wide mb-1.5">{c.titolo}</div>
          <p className="text-ink-dim text-[13px] leading-snug mb-2">{c.testo}</p>
          {c.link && (
            <a
              href={c.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink-faint hover:text-cool-ink transition-colors"
            >
              {t("infolavoriLink")}
              <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
