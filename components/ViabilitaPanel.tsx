"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  autostrada: string;
  carreggiata: string;
  testo: string;
  inizio: string;
  fine: string | null;
  fonte: string;
};

type ViabilitaData = { eventi: Evento[]; aggiornato_al: string };

// Colore indicativo in base a parole chiave nel testo dell'evento —
// il feed non fornisce un livello di gravità esplicito, solo il testo
function coloreEvento(testo: string): "ok" | "warn" | "bad" {
  const t = testo.toLowerCase();
  if (t.includes("chius") || t.includes("incidente")) return "bad";
  if (t.includes("coda") || t.includes("rallent")) return "warn";
  return "ok";
}

export function ViabilitaPanel() {
  const [dati, setDati] = useState<ViabilitaData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "viabilita:autostrade")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as ViabilitaData);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento viabilità…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati viabilità non disponibili al momento.</p>;
  }
  if (dati.eventi.length === 0) {
    return (
      <p className="text-ink-dim text-sm">
        Nessun evento di rilievo sulla rete autostradale del FVG al momento.
      </p>
    );
  }

  const coloreClass = { ok: "bg-allerta-verde", warn: "bg-allerta-gialla", bad: "bg-allerta-rossa" };

  return (
    <div>
      {dati.eventi.slice(0, 6).map((e, i) => (
        <div key={i} className={`flex items-center gap-2.5 py-2.5 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${coloreClass[coloreEvento(e.testo)]}`} />
          <span className="font-cond font-semibold min-w-[36px]">{e.autostrada}</span>
          <span className="text-ink-dim flex-1">{e.testo}</span>
        </div>
      ))}
    </div>
  );
}
