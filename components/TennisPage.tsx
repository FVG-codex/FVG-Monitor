"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

type GiocatoreTennis = {
  nome: string;
  cognome: string;
  comune: string;
  grado: string;
  categoriaRanking: string;
  partiteVinte: number | null;
  partitePerse: number | null;
};

type CategoriaTennis = {
  slug: string;
  nome: string;
  giocatori: GiocatoreTennis[];
  totale_categoria: number;
};

type TennisData = {
  categorie: CategoriaTennis[];
  aggiornato_al: string;
};

function nomeCompleto(g: GiocatoreTennis): string {
  const cap = (s: string) =>
    s
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return `${cap(g.cognome)} ${cap(g.nome)}`;
}

export function TennisPage() {
  const [dati, setDati] = useState<TennisData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [categoria, setCategoria] = useState("maschile-2a-categoria");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "tennis:classifica")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as TennisData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const attiva = dati?.categorie.find((c) => c.slug === categoria);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sport" className="text-cool-ink text-xs font-mono hover:underline">
          ← Sport
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          Tennis — Classifica Assoluti FVG
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Migliori tesserati FVG in categoria Assoluti, divisi per 2ª/3ª/4ª categoria di
          classifica e per genere — fonte: FITP (Federazione Italiana Tennis e Padel)
        </p>

        {dati && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            {dati.categorie.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategoria(c.slug)}
                aria-pressed={categoria === c.slug}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  categoria === c.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && attiva && (
          <div className="grid grid-cols-1 gap-px bg-line border border-line">
            <Panel title={`${attiva.nome} — Top ${attiva.giocatori.length}`}>
              {attiva.giocatori.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessun giocatore trovato per questa categoria.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line font-mono text-[10px] text-ink-faint uppercase">
                          <th className="text-left py-2 pr-2">#</th>
                          <th className="text-left py-2">Giocatore</th>
                          <th className="text-left py-2 px-2">Comune</th>
                          <th className="text-right py-2 px-2">Grado</th>
                          <th className="text-right py-2 pl-2">V-P</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attiva.giocatori.map((g, i) => (
                          <tr key={i} className="border-b border-line">
                            <td className="py-2 pr-2 font-mono text-ink-faint">{i + 1}</td>
                            <td className="py-2">{nomeCompleto(g)}</td>
                            <td className="py-2 px-2 text-ink-dim">{g.comune}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold">{g.grado}</td>
                            <td className="py-2 pl-2 text-right font-mono text-ink-dim">
                              {g.partiteVinte ?? "–"}-{g.partitePerse ?? "–"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-ink-faint text-[10px] font-mono mt-3">
                    {attiva.totale_categoria} tesserati FVG in questa categoria — ordinati per grado
                    (sub-livello più basso = migliore) · dati aggiornati al{" "}
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

      <Footer />
    </>
  );
}
