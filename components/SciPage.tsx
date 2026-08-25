"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";

type GaraSci = {
  id: string | null;
  nome: string | null;
  disciplina: string | null;
  data: string | null; // ISO yyyy-mm-dd
  comune: string | null;
  provincia: string | null;
  livello: string | null;
  stato: string | null;
  formato: string | null;
};

type SciData = {
  stagione: string;
  discipline: string[];
  gare: GaraSci[];
  aggiornato_al: string;
};

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function SciPage() {
  const [dati, setDati] = useState<SciData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [disciplina, setDisciplina] = useState<string>("tutte");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "sci:calendario")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SciData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const gareFiltrate = dati
    ? disciplina === "tutte"
      ? dati.gare
      : dati.gare.filter((g) => g.disciplina === disciplina)
    : [];

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sport" className="text-cool text-xs font-mono hover:underline">
          ← Sport
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          Sci — Calendario gare FVG
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {dati ? `Stagione ${dati.stagione}` : "Calendario gare"} — sport invernali FISI in Friuli Venezia
          Giulia (fondo, salto, combinata nordica, biathlon e altre discipline) — fonte: FISI (Federazione
          Italiana Sport Invernali), Comitato FVG. Calendario, non classifica: qui non c&apos;è un campionato
          a punti, ogni riga è una gara singola.
        </p>

        {dati && dati.discipline.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            <button
              onClick={() => setDisciplina("tutte")}
              aria-pressed={disciplina === "tutte"}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                disciplina === "tutte" ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              Tutte
            </button>
            {dati.discipline.map((d) => (
              <button
                key={d}
                onClick={() => setDisciplina(d)}
                aria-pressed={disciplina === d}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  disciplina === d ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 gap-px bg-line border border-line">
            <Panel title={`Gare in calendario${disciplina !== "tutte" ? ` — ${disciplina}` : ""}`}>
              {gareFiltrate.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessuna gara trovata per questo filtro.</p>
              ) : (
                <>
                  {gareFiltrate.map((g, i) => (
                    <div key={g.id ?? i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-mono text-[10px] text-ink-faint uppercase">
                          {g.data ? formattaData(g.data) : "Data da definire"} · {g.comune}
                          {g.provincia ? ` (${g.provincia})` : ""}
                        </div>
                        <div className="font-mono text-[9px] text-ink-faint uppercase shrink-0">{g.stato}</div>
                      </div>
                      <div className="text-sm">{g.nome}</div>
                      <div className="font-mono text-[10px] text-ink-faint mt-0.5 uppercase">
                        {g.disciplina}
                        {g.livello ? ` · ${g.livello}` : ""}
                      </div>
                    </div>
                  ))}
                  <p className="text-ink-faint text-[10px] font-mono mt-3">
                    {gareFiltrate.length} gare · dati aggiornati al{" "}
                    {new Date(dati.aggiornato_al).toLocaleString("it-IT", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}
