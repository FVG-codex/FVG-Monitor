"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VocePrevisione = {
  titolo: string;
  link: string;
  data: string;
  autore: string | null;
  estratto: string | null;
};
type PazziPrevisioniData = { fonte: string; fonte_url: string; items: VocePrevisione[] };

function tempoRelativo(dataStr: string): string {
  const diffMs = Date.now() - new Date(dataStr).getTime();
  const minuti = Math.floor(diffMs / 60000);
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  return `${Math.floor(ore / 24)} g fa`;
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento previsioni…</p>;
  }
  if (stato === "error" || !dati || dati.items.length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Previsioni non disponibili al momento.</p>;
  }

  return (
    <div>
      {dati.items.slice(0, 4).map((v, i) => (
        <div key={v.link} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
          <a href={v.link} target="_blank" rel="noopener noreferrer" className="block">
            <div className="text-ink text-[15px] leading-snug mb-1.5 hover:text-cool-ink transition-colors">
              {v.titolo}
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </div>
          </a>
          {v.estratto && <p className="text-ink-dim text-[13px] leading-snug mb-1.5">{v.estratto}</p>}
          <div className="flex gap-2 items-center font-mono text-[10px] text-ink-faint uppercase tracking-wide">
            {v.autore && <span className="text-warm">{v.autore}</span>}
            <span>· {tempoRelativo(v.data)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
