"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";

type Partita = {
  casa: string;
  casaFvg: boolean;
  ospite: string;
  ospiteFvg: boolean;
  punteggioCasa: number | null;
  punteggioOspite: number | null;
  data: string;
  stato: string;
  luogo: string;
};

type RigaClassifica = {
  girone: string;
  posizione: number;
  squadra: string;
  squadraFvg: boolean;
  vittorie: number;
  sconfitte: number;
  percentuale: number;
  partiteDietro: number;
};

type BaseballData = {
  campionato: string;
  sport: string;
  partite: Partita[];
  classifica: RigaClassifica[];
  aggiornato_al: string;
};

// Competizioni note al momento della scrittura — se live.baseballfvg.it
// ne aggiunge altre, vanno aggiunte qui (l'id è quello del campo
// "competition.id" restituito dall'API calendario).
const COMPETIZIONI = [
  { slug: "serie-a-silver-2026", label: "Serie A Silver" },
  { slug: "serie-b-baseball-2026", label: "Serie B Baseball" },
  { slug: "serie-a2-softball-2026", label: "Serie A2 Softball" },
];

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function raggruppaPerGirone(righe: RigaClassifica[]): Map<string, RigaClassifica[]> {
  const mappa = new Map<string, RigaClassifica[]>();
  for (const r of righe) {
    const lista = mappa.get(r.girone) ?? [];
    lista.push(r);
    mappa.set(r.girone, lista);
  }
  return mappa;
}

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

  const gironi = dati ? raggruppaPerGirone(dati.classifica) : new Map<string, RigaClassifica[]>();

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sport" className="text-cool text-xs font-mono hover:underline">
          ← Sport
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {stato === "ready" && dati ? dati.campionato : "Baseball & Softball"}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Baseball e softball FVG — squadre in evidenza — fonte: live.baseballfvg.it
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
            <Panel title={`${dati.campionato} — Ultimi risultati`}>
              {dati.partite.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessuna partita disponibile.</p>
              ) : (
                dati.partite.map((p, i) => (
                  <div key={i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="font-mono text-[10px] text-ink-faint mb-1.5 uppercase">
                      {formattaData(p.data)} · {p.luogo}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex-1 ${p.casaFvg ? "text-cool font-semibold" : ""}`}>{p.casa}</span>
                      <span className="font-cond font-bold text-lg px-3">
                        {p.punteggioCasa ?? "–"} : {p.punteggioOspite ?? "–"}
                      </span>
                      <span className={`flex-1 text-right ${p.ospiteFvg ? "text-cool font-semibold" : ""}`}>
                        {p.ospite}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </Panel>

            <Panel title={`${dati.campionato} — Classifica`}>
              {Array.from(gironi.entries()).map(([nomeGirone, righe]) => (
                <div key={nomeGirone} className="mb-4 last:mb-0">
                  <div className="font-cond font-semibold text-xs uppercase tracking-wide text-ink-faint mb-2">
                    {nomeGirone}
                  </div>
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
                        {righe
                          .sort((a: RigaClassifica, b: RigaClassifica) => a.posizione - b.posizione)
                          .map((r) => (
                            <tr key={r.posizione} className="border-b border-line">
                              <td className="py-2 pr-2 font-mono text-ink-faint">{r.posizione}</td>
                              <td className={`py-2 ${r.squadraFvg ? "text-cool font-semibold" : ""}`}>
                                {r.squadra}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold">{r.vittorie}</td>
                              <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.sconfitte}</td>
                              <td className="py-2 px-2 text-right font-mono text-ink-dim">
                                {r.percentuale?.toFixed(3)}
                              </td>
                              <td className="py-2 pl-2 text-right font-mono text-ink-dim">{r.partiteDietro}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
