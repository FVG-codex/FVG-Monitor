"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  titolo: string;
  luogo: string;
  giorno: string;
  mese: string;
  data_testo: string;
  link: string;
};

type EventiData = { eventi: Evento[]; aggiornato_al: string };

export function EventiPanel() {
  const [dati, setDati] = useState<EventiData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "eventi:turismofvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as EventiData);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento eventi…</p>;
  }
  if (stato === "error" || !dati || dati.eventi.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Eventi non disponibili al momento.</p>;
  }

  return (
    <div>
      {dati.eventi.slice(0, 5).map((e, i) => (
        <a
          key={e.link}
          href={e.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex gap-3 py-2.5 items-baseline ${i > 0 ? "border-t border-line" : ""} hover:bg-panel-alt transition-colors -mx-1 px-1`}
        >
          <div className="font-mono text-cool-ink text-xs flex-shrink-0 w-9 text-center">
            <div className="text-base leading-none">{e.giorno}</div>
            <div>{e.mese}</div>
          </div>
          <div className="min-w-0">
            <div className="text-ink text-sm leading-snug">
              {e.titolo}
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </div>
            {e.luogo && <div className="text-ink-faint text-xs font-mono mt-0.5">{e.luogo}</div>}
          </div>
        </a>
      ))}
      <p className="text-ink-faint text-[10px] font-mono mt-3 border-t border-line pt-2">
        Fonte: Turismo FVG (PromoTurismoFVG)
      </p>
    </div>
  );
}
