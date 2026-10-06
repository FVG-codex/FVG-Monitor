"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import type { ColonnineElettricheData } from "@/lib/colonnineElettriche";

// Riassunto per l'hub Viabilità (spostato qui da Trasporti il
// 03/10/2026, stesso giorno, su richiesta dell'utente) — la mappa
// completa (con selettore di posizione e raggio) vive nella pagina
// dedicata /colonnine-elettriche (decisione utente, 02/10/2026). Vedi
// quella pagina e il commento "COLONNINE ELETTRICHE" in
// scripts/ingest-light.mjs per i dettagli.
export function ColonninePanel() {
  const [dati, setDati] = useState<ColonnineElettricheData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("colonnineElettriche");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "colonnine-elettriche:fvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as ColonnineElettricheData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div>
      {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
      {stato === "error" && <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>}
      {stato === "ready" && dati && (
        <p className="text-ink-dim text-sm">
          {t.rich("panelDescrizione", {
            totale: dati.totale,
            strong: (chunks) => <span className="font-cond font-bold text-2xl text-ink">{chunks}</span>,
          })}
        </p>
      )}
      <Link href="/colonnine-elettriche" className="inline-block mt-3 font-mono text-[11px] text-cool-ink hover:underline">
        {t("vediMappa")}
      </Link>
    </div>
  );
}
