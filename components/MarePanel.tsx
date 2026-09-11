"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProvinciaSlug } from "@/lib/province";

type MareData = { stazione: string; aggiornato_al: string; livello_m: number };

const LOCALITA = ["trieste", "grado", "lignano"] as const;

// Mappa provincia → località costiera più vicina (11/09/2026, per la
// nuova pagina "Dati ambientali" sotto Ambiente) — il dato Mare non è
// nativamente per provincia ma per 3 località puntuali, quindi qui è
// una scelta esplicita (non derivata) di quale località rappresenta
// ciascuna provincia: Trieste→Trieste, Gorizia→Grado (unico comune
// costiero della provincia), Udine→Lignano (unico tratto di costa della
// provincia). Pordenone non ha sbocco al mare — nessuna voce nella
// mappa, gestita a parte con un messaggio esplicativo invece di un
// riquadro vuoto o un dato inventato.
const LOCALITA_PER_PROVINCIA: Partial<Record<ProvinciaSlug, (typeof LOCALITA)[number]>> = {
  trieste: "trieste",
  gorizia: "grado",
  udine: "lignano",
};

export function MarePanel({ provincia }: { provincia?: ProvinciaSlug } = {}) {
  const [datiPerLocalita, setDatiPerLocalita] = useState<Partial<Record<string, MareData>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const ids = LOCALITA.map((l) => `mare:${l}`);
      const { data, error } = await supabase.from("snapshots").select("id, data").in("id", ids);
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const mappa: Partial<Record<string, MareData>> = {};
      for (const row of data) {
        const d = row.data as MareData;
        mappa[row.id.replace("mare:", "")] = { ...d, livello_m: Math.round(d.livello_m * 100) / 100 };
      }
      setDatiPerLocalita(mappa);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento livello mare…</p>;
  }
  if (stato === "error" || Object.keys(datiPerLocalita).length === 0) {
    return <p className="text-ink-faint text-sm font-mono">Dati livello mare non disponibili al momento.</p>;
  }

  if (provincia) {
    const localita = LOCALITA_PER_PROVINCIA[provincia];
    if (!localita) {
      return (
        <p className="text-ink-faint text-sm font-mono">
          La provincia di Pordenone non ha sbocco sul mare — nessuna stazione di riferimento.
        </p>
      );
    }
    const d = datiPerLocalita[localita];
    return (
      <div>
        <div className="font-mono text-xs text-cool-ink mb-1 uppercase">{localita}</div>
        {d ? (
          <div className="flex items-baseline gap-2">
            <span className="font-cond font-bold text-[44px] leading-[0.9]">
              {d.livello_m > 0 ? "+" : ""}
              {d.livello_m}
            </span>
            <span className="text-ink-dim text-sm">m IGM42</span>
          </div>
        ) : (
          <p className="font-mono text-sm text-ink-faint">n.d.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {LOCALITA.map((l) => {
        const d = datiPerLocalita[l];
        return (
          <div key={l} className="flex-1 min-w-[72px] border border-line rounded p-2 text-center">
            <div className="font-cond font-semibold text-xs mb-1 capitalize">{l}</div>
            {d ? (
              <>
                <div className="font-mono font-bold text-lg text-ink">
                  {d.livello_m > 0 ? "+" : ""}
                  {d.livello_m}
                </div>
                <div className="font-mono text-[9px] text-ink-faint">m IGM42</div>
              </>
            ) : (
              <div className="font-mono text-xs text-ink-faint">n.d.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
