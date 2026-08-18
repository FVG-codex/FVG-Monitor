"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";

type Partita = {
  casa: string;
  ospite: string;
  golCasa: number | null;
  golOspite: number | null;
  data: string;
  ora: string;
  campo: string;
  logoCasa: string;
  logoOspite: string;
  inCorso: boolean;
};

type RigaClassifica = {
  posizione: number;
  squadra: string;
  logo: string;
  punti: number;
  giocate: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
};

type CalcioData = {
  campionato: string;
  girone: string;
  giornata_corrente: { number: number; leg: string; startDate: string; endDate: string } | null;
  partite: Partita[];
  classifica: RigaClassifica[];
  aggiornato_al: string;
};

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function nomeSquadra(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CalcioPage() {
  const [dati, setDati] = useState<CalcioData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<"calendario" | "classifica">("calendario");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "calcio:eccellenza-a")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as CalcioData);
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
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">
          {stato === "ready" && dati ? `${dati.campionato} — ${dati.girone}` : "Risultati calcistici"}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Campionati dilettantistici regionali FVG — fonte: LND Comitato Regionale FVG
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <Panel title={dati.campionato}>
            <div className="flex gap-1 mb-4">
              {(["calendario", "classifica"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    tab === t ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {t === "calendario" ? "Calendario" : "Classifica"}
                </button>
              ))}
            </div>

            {tab === "calendario" && (
              <div>
                {dati.giornata_corrente && (
                  <div className="font-cond font-semibold text-xs uppercase tracking-wide text-ink-faint mb-3">
                    Giornata {dati.giornata_corrente.number} · {dati.giornata_corrente.leg === "first" ? "andata" : "ritorno"}
                  </div>
                )}
                {dati.partite.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessuna partita in programma.</p>
                ) : (
                  dati.partite.map((p, i) => (
                    <div key={i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                      <div className="font-mono text-[10px] text-ink-faint mb-1.5 uppercase">
                        {formattaData(p.data)} · {p.ora.slice(0, 5)} · {p.campo}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex-1">{nomeSquadra(p.casa)}</span>
                        <span className="font-cond font-bold text-lg px-3">
                          {p.golCasa ?? "–"} : {p.golOspite ?? "–"}
                        </span>
                        <span className="flex-1 text-right">{nomeSquadra(p.ospite)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "classifica" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-[10px] text-ink-faint uppercase">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2">Squadra</th>
                      <th className="text-right py-2 px-2">Pt</th>
                      <th className="text-right py-2 px-2">G</th>
                      <th className="text-right py-2 px-2">V</th>
                      <th className="text-right py-2 px-2">N</th>
                      <th className="text-right py-2 px-2">P</th>
                      <th className="text-right py-2 pl-2">DR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.classifica.map((r) => (
                      <tr key={r.posizione} className="border-b border-line">
                        <td className="py-2 pr-2 font-mono text-ink-faint">{r.posizione}</td>
                        <td className="py-2">{nomeSquadra(r.squadra)}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{r.punti}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.giocate}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.vittorie}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.pareggi}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.sconfitte}</td>
                        <td className="py-2 pl-2 text-right font-mono text-ink-dim">
                          {r.golFatti - r.golSubiti > 0 ? "+" : ""}
                          {r.golFatti - r.golSubiti}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </main>
    </>
  );
}
