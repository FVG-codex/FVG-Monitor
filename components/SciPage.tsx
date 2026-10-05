"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { intlLocale } from "@/lib/intlLocale";

type GaraSci = {
  id: string | null;
  nome: string | null;
  disciplina: string | null;
  data: string | null; // ISO yyyy-mm-dd
  comune: string | null;
  provincia: string | null;
  livello: string | null;
  svolta: boolean;
  stato: string | null; // "Svolta" / "In programma" — calcolato dalla data, non dall'API
  formato: string | null;
};

type SciData = {
  stagione: string;
  discipline: string[];
  gare: GaraSci[];
  aggiornato_al: string;
};

type RisultatoGaraSci = {
  posizione: string | null;
  codFisi: string | null;
  atleta: string | null;
  anno: string | null;
  societa: string | null;
  tempoGara: string | null;
  puntiGara: string | null;
  puntiGraduatoria: string | null;
};

type GaraConRisultatiSci = {
  idGara: string;
  idCompetizione: string;
  disciplina: string | null;
  provincia: string | null;
  comune: string | null;
  nomeCompetizione: string | null;
  codice: string | null;
  tipoGara: string | null;
  categoria: string | null;
  genere: string | null;
  risultati: RisultatoGaraSci[];
};

type CompetizioneRisultatiSci = {
  completo: boolean;
  nomeCompetizione: string | null;
  data: string | null;
  gare: GaraConRisultatiSci[];
};

type RisultatiSciData = {
  competizioni: Record<string, CompetizioneRisultatiSci>;
  aggiornato_al: string;
};

function formattaData(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Nomi atleta arrivano dalla fonte sia TUTTO MAIUSCOLO che Title Case,
// senza un pattern affidabile — normalizzati qui allo stesso modo del
// Tennis (`nomeCompleto` in TennisPage.tsx).
function capitalizza(s: string | null): string {
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function SciPage() {
  const [dati, setDati] = useState<SciData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [disciplina, setDisciplina] = useState<string>("tutte");

  const [risultati, setRisultati] = useState<RisultatiSciData | null>(null);
  const [risultatiCaricati, setRisultatiCaricati] = useState(false);

  const [competizioneEspansa, setCompetizioneEspansa] = useState<string | null>(null);
  const [garaEspansa, setGaraEspansa] = useState<string | null>(null);
  const t = useTranslations("sci");
  const tNav = useTranslations("nav");
  const tAviazione = useTranslations("aviazione");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const [calendario, ris] = await Promise.all([
        supabase.from("snapshots").select("data").eq("id", "sci:calendario").single(),
        supabase.from("snapshots").select("data").eq("id", "sci:risultati").maybeSingle(),
      ]);
      if (!attivo) return;

      if (calendario.error || !calendario.data) {
        setStato("error");
      } else {
        setDati(calendario.data.data as SciData);
        setStato("ready");
      }

      // I risultati sono un dato "annesso" e opzionale (può non esserci
      // ancora nessuna competizione passata, o non essere stata ancora
      // scaricata — vedi ingest-light.mjs): un errore/assenza qui non è
      // trattato come errore di pagina, solo come "non disponibile".
      if (!ris.error && ris.data) {
        setRisultati(ris.data.data as RisultatiSciData);
      }
      setRisultatiCaricati(true);
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

  function toggleCompetizione(id: string) {
    setGaraEspansa(null);
    setCompetizioneEspansa((corrente) => (corrente === id ? null : id));
  }

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sport" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("sport")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {dati ? t("stagione", { stagione: dati.stagione }) : t("calendarioGare")}
          {t("descrizione")}
        </p>

        {dati && dati.discipline.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            <button
              onClick={() => setDisciplina("tutte")}
              aria-pressed={disciplina === "tutte"}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                disciplina === "tutte" ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {tAviazione("filtri.tutte")}
            </button>
            {dati.discipline.map((d) => (
              <button
                key={d}
                onClick={() => setDisciplina(d)}
                aria-pressed={disciplina === d}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  disciplina === d ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>
        )}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 gap-px bg-line border border-line">
            <Panel title={`${t("gareInCalendario")}${disciplina !== "tutte" ? ` — ${disciplina}` : ""}`}>
              {gareFiltrate.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">{t("nessunaGara")}</p>
              ) : (
                <>
                  {gareFiltrate.map((g, i) => {
                    const idComp = g.id;
                    const espansa = g.svolta && idComp !== null && competizioneEspansa === idComp;
                    const competizioneRisultati = idComp ? risultati?.competizioni[idComp] : undefined;

                    return (
                      <div key={idComp ?? i} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <button
                          type="button"
                          onClick={() => g.svolta && idComp && toggleCompetizione(idComp)}
                          disabled={!g.svolta || !idComp}
                          aria-expanded={g.svolta ? espansa : undefined}
                          className={`w-full text-left ${g.svolta ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="font-mono text-[10px] text-ink-faint uppercase">
                              {g.data ? formattaData(g.data, locale) : t("dataDaDefinire")} · {g.comune}
                              {g.provincia ? ` (${g.provincia})` : ""}
                            </div>
                            <div
                              className={`font-mono text-[9px] uppercase shrink-0 px-1.5 py-0.5 rounded ${
                                g.svolta ? "text-ink-dim border border-line" : "text-cool-ink"
                              }`}
                            >
                              {g.svolta ? t("stato.svolta") : t("stato.inProgramma")}
                              {g.svolta ? (espansa ? " ▲" : " ▼") : ""}
                            </div>
                          </div>
                          <div className="text-sm">{g.nome}</div>
                          <div className="font-mono text-[10px] text-ink-faint mt-0.5 uppercase">
                            {g.disciplina}
                            {g.livello ? ` · ${g.livello}` : ""}
                          </div>
                        </button>

                        {espansa && (
                          <div className="mt-3 ml-2 pl-3 border-l-2 border-line">
                            {!risultatiCaricati ? (
                              <p className="text-ink-faint text-xs font-mono">{t("caricamentoRisultati")}</p>
                            ) : !competizioneRisultati ? (
                              <p className="text-ink-faint text-xs font-mono">{t("risultatiNonDisponibili")}</p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {competizioneRisultati.gare.map((gara) => {
                                  const garaAperta = garaEspansa === gara.idGara;
                                  return (
                                    <div key={gara.idGara}>
                                      <button
                                        type="button"
                                        onClick={() => setGaraEspansa(garaAperta ? null : gara.idGara)}
                                        aria-expanded={garaAperta}
                                        className="w-full text-left flex items-center justify-between gap-2 py-1 text-xs hover:text-cool-ink"
                                      >
                                        <span>
                                          {gara.tipoGara} <span className="text-ink-faint">— {gara.categoria}</span>
                                        </span>
                                        <span className="font-mono text-[9px] text-ink-faint shrink-0">
                                          {t("risultatiCount", { count: gara.risultati.length })} {garaAperta ? "▲" : "▼"}
                                        </span>
                                      </button>

                                      {garaAperta && (
                                        <div className="overflow-x-auto mb-2">
                                          {gara.risultati.length === 0 ? (
                                            <p className="text-ink-faint text-[11px] font-mono py-1">
                                              {t("nessunRisultatoGara")}
                                            </p>
                                          ) : (
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="border-b border-line font-mono text-[9px] text-ink-faint uppercase">
                                                  <th className="text-left py-1 pr-2">{t("colPos")}</th>
                                                  <th className="text-left py-1 pr-2">{t("colAtleta")}</th>
                                                  <th className="text-left py-1 px-2">{t("colAnno")}</th>
                                                  <th className="text-left py-1 px-2">{t("colSocieta")}</th>
                                                  <th className="text-right py-1 px-2">{t("colTempo")}</th>
                                                  <th className="text-right py-1 pl-2">{t("colPunti")}</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {gara.risultati.map((r, ri) => (
                                                  <tr key={ri} className="border-b border-line">
                                                    <td className="py-1 pr-2 font-mono text-ink-faint">
                                                      {r.posizione ?? "–"}
                                                    </td>
                                                    <td className="py-1 pr-2">{capitalizza(r.atleta)}</td>
                                                    <td className="py-1 px-2 text-ink-dim">{r.anno ?? "–"}</td>
                                                    <td className="py-1 px-2 text-ink-dim">{r.societa ?? "–"}</td>
                                                    <td className="py-1 px-2 text-right font-mono">
                                                      {r.tempoGara ?? "–"}
                                                    </td>
                                                    <td className="py-1 pl-2 text-right font-mono text-ink-dim">
                                                      {r.puntiGraduatoria ?? "–"}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-ink-faint text-[10px] font-mono mt-3">
                    {t("gareAggiornateAl", {
                      count: gareFiltrate.length,
                      data: new Date(dati.aggiornato_al).toLocaleString(intlLocale(locale), {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
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
