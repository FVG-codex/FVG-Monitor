"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ColonnineElettricheData } from "@/lib/colonnineElettriche";

// Riassunto per l'hub Trasporti — la mappa completa (con selettore di
// posizione e raggio) vive nella pagina dedicata /colonnine-elettriche
// (decisione utente, 02/10/2026). Vedi quella pagina e il commento
// "COLONNINE ELETTRICHE" in scripts/ingest-light.mjs per i dettagli.
export function ColonninePanel() {
  const [dati, setDati] = useState<ColonnineElettricheData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

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
      {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
      {stato === "error" && <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>}
      {stato === "ready" && dati && (
        <p className="text-ink-dim text-sm">
          <span className="font-cond font-bold text-2xl text-ink">{dati.totale}</span> colonnine di ricarica
          elettrica censite in Friuli Venezia Giulia (fonte: OpenChargeMap, dato comunitario — vedi la pagina
          dedicata per i dettagli e le date di verifica).
        </p>
      )}
      <Link href="/colonnine-elettriche" className="inline-block mt-3 font-mono text-[11px] text-cool-ink hover:underline">
        Vedi la mappa e cerca vicino a te →
      </Link>
    </div>
  );
}
