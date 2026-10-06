"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import type { ProvinciaSlug } from "@/lib/province";

type VentoData = {
  stazione: string;
  aggiornato_al: string;
  velocita_kmh: number | null;
  raffica_kmh: number | null;
  direzione_gradi: number | null;
  direzione_raffica_gradi: number | null;
};

// Converte i gradi in punto cardinale, più leggibile di un numero nudo
function puntoCardinale(gradi: number | null): string {
  if (gradi === null) return "—";
  const punti = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return punti[Math.round(gradi / 45) % 8];
}

export function VentoPanel({
  provincia = "trieste",
  compatto = false,
}: {
  provincia?: ProvinciaSlug;
  // Nasconde la riga "Fonte: ..." interna — usato in homepage quando il
  // pannello è unito con PioggiaPanel dentro un unico Panel (altrimenti
  // la fonte, identica per entrambi, comparirebbe due volte di fila).
  // Default false: nelle altre pagine (ProvinciaPage, MeteoPage) resta
  // un pannello a sé stante col comportamento di sempre.
  compatto?: boolean;
}) {
  const [dati, setDati] = useState<VentoData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("vento");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data, updated_at")
        .eq("id", `vento:${provincia}`)
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as VentoData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [provincia]);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">{t("caricamento")}</p>;
  }
  if (stato === "error" || !dati || dati.velocita_kmh === null) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        {t("nonDisponibili")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-cond font-bold text-[52px] leading-[0.9]">{dati.velocita_kmh}</span>
        <span className="text-ink-dim text-sm">km/h</span>
      </div>
      <div className="font-mono text-xs text-cool-ink mb-4">
        {t("daStazione", { direzione: puntoCardinale(dati.direzione_gradi), stazione: dati.stazione.toUpperCase() })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3">
        <span>
          {t("rafficaMax", { raffica: dati.raffica_kmh ?? "—" })}
          {dati.direzione_raffica_gradi !== null && ` (${puntoCardinale(dati.direzione_raffica_gradi)})`}
        </span>
        <span>{dati.aggiornato_al}</span>
      </div>
      {!compatto && (
        <p className="text-ink-faint text-[10px] font-mono mt-2">
          {tChrome("fonteProtezioneCivile")}
        </p>
      )}
    </div>
  );
}
