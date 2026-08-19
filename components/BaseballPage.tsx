"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";

type Partita = {
  ospite: string;
  locali: string;
  puntiOspite: string | null;
  puntiLocali: string | null;
  dataOra: string;
  luogo: string;
  stato: string | null;
};

type RigaClassifica = {
  posizione: string;
  squadra: string;
  vittorie: string;
  sconfitte: string;
  percentuale: string;
  partiteDietro: string;
};

type BaseballData = {
  campionato: string;
  partite: Partita[];
  classifica: RigaClassifica[];
  aggiornato_al: string;
};

// Deve corrispondere a COMPETIZIONI_BASEBALL in scripts/ingest-light.mjs
const COMPETIZIONI = [{ slug: "serie-a-silver", label: "Serie A Silver" }];

export function BaseballPage() {
  const [dati, setDati] = useState<BaseballData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [competizione, setCompetizione] = useState(COMPETIZIONI[0].slug);

  useEffect(() => {
    let attivo = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `baseball:${competizione}`)
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as BaseballData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [competizione]);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">
          {stato === "ready" && dati ? dati.campionato : "Risultati baseball"}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Baseball nazionale — squadra FVG di riferimento: GEREON Engineering NBP Ronchi — fonte: FIBS
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {COMPETIZIONI.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCompetizione(c.slug)}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                competizione === c.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
            <Panel title={`${dati.campionato} — Calendario`}>
              {dati.partite.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessuna partita in programma.</p>
              ) : (
                dati.partite.map((p, i) => (
                  <div key={i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="font-mono text-[10px] text-ink-faint mb-1.5 uppercase">
                      {p.dataOra} {p.stato && `· ${p.stato}`}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex-1">{p.ospite}</span>
                      <span className="font-cond font-bold text-lg px-3">
                        {p.puntiOspite ?? "–"} : {p.puntiLocali ?? "–"}
                      </span>
                      <span className="flex-1 text-right">{p.locali}</span>
                    </div>
                    <div className="font-mono text-[10px] text-ink-faint mt-1">{p.luogo}</div>
                  </div>
                ))
              )}
            </Panel>

            <Panel title={`${dati.campionato} — Classifica`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-[10px] text-ink-faint uppercase">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2">Squadra</th>
                      <th className="text-right py-2 px-2">V</th>
                      <th className="text-right py-2 px-2">P</th>
                      <th className="text-right py-2 px-2">%</th>
                      <th className="text-right py-2 pl-2">GB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.classifica.map((r, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="py-2 pr-2 font-mono text-ink-faint">{r.posizione}</td>
                        <td className="py-2">{r.squadra}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{r.vittorie}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.sconfitte}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.percentuale}</td>
                        <td className="py-2 pl-2 text-right font-mono text-ink-dim">{r.partiteDietro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
