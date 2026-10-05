"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

type Partita = {
  casa: string;
  ospite: string;
  puntiCasa: string | null;
  puntiOspite: string | null;
  data: string;
  ora: string;
};

type RigaClassifica = {
  posizione: string;
  squadra: string;
  punti: string;
  giocate: string;
  vittorie: string;
  sconfitte: string;
  puntiFatti: string;
  puntiSubiti: string;
};

type BasketData = {
  campionato: string;
  girone: string;
  partite: Partita[];
  classifica: RigaClassifica[];
  aggiornato_al: string;
};

function nomeSquadra(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Deve corrispondere a COMPETIZIONI_BASKET in scripts/ingest-light.mjs
const COMPETIZIONI = [{ slug: "trieste-serie-c", label: "Serie C — Divisione Regionale 1" }];

export function BasketPage() {
  const [dati, setDati] = useState<BasketData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [competizione, setCompetizione] = useState(COMPETIZIONI[0].slug);
  const t = useTranslations("basket");
  const tSport = useTranslations("sport");
  const tNav = useTranslations("nav");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `basket:${competizione}`)
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as BasketData);
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

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sport" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("sport")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {stato === "ready" && dati ? `${dati.campionato} — ${dati.girone}` : t("titoloFallback")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("descrizione")}</p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {COMPETIZIONI.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCompetizione(c.slug)}
              aria-pressed={competizione === c.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                competizione === c.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>
        )}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
            <Panel title={`${dati.campionato} — ${tSport("calendario")}`}>
              {dati.partite.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">{tSport("nessunaPartita")}</p>
              ) : (
                dati.partite.map((p, i) => (
                  <div key={i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="font-mono text-[10px] text-ink-faint mb-1.5 uppercase">
                      {p.data} · {p.ora}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex-1">{nomeSquadra(p.casa)}</span>
                      <span className="font-cond font-bold text-lg px-3">
                        {p.puntiCasa || "–"} : {p.puntiOspite || "–"}
                      </span>
                      <span className="flex-1 text-right">{nomeSquadra(p.ospite)}</span>
                    </div>
                  </div>
                ))
              )}
            </Panel>

            <Panel title={`${dati.campionato} — ${tSport("classifica")}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-[10px] text-ink-faint uppercase">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2">{tSport("colSquadra")}</th>
                      <th className="text-right py-2 px-2">{tSport("colPt")}</th>
                      <th className="text-right py-2 px-2">{tSport("colG")}</th>
                      <th className="text-right py-2 px-2">{tSport("colV")}</th>
                      <th className="text-right py-2 px-2">{tSport("colP")}</th>
                      <th className="text-right py-2 px-2">{tSport("colPF")}</th>
                      <th className="text-right py-2 pl-2">{tSport("colPS")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.classifica.map((r, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="py-2 pr-2 font-mono text-ink-faint">{r.posizione}</td>
                        <td className="py-2">{nomeSquadra(r.squadra)}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{r.punti}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.giocate}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.vittorie}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.sconfitte}</td>
                        <td className="py-2 px-2 text-right font-mono text-ink-dim">{r.puntiFatti}</td>
                        <td className="py-2 pl-2 text-right font-mono text-ink-dim">{r.puntiSubiti}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
