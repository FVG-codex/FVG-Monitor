"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { MareeGraficoOggi } from "@/components/MareeGraficoOggi";

// Pagina "Maree" (02/10/2026, richiesto dall'utente il 13/09/2026) — vedi
// i commenti sopra ingestMareeOsservate()/ingestMareePreviste() in
// scripts/ingest-light.mjs per le fonti dati e le scelte fatte.
//
// Due blocchi separati per stazione (decisione utente, 02/10/2026):
// "Oggi (osservato)" = picchi realmente registrati nella giornata
// corrente (fonte: Protezione Civile FVG, dato ufficiale); "Prossimi
// giorni (previsione)" = previsione astronomica (fonte: tide-forecast.com,
// non ufficiale). Pagina dedicata (non un pannello in homepage, decisione
// utente) — raggiungibile da Ambiente, come Terremoti.

const STAZIONI = [
  { slug: "trieste", nome: "Trieste" },
  { slug: "grado", nome: "Grado" },
  { slug: "lignano", nome: "Lignano" },
] as const;

type PuntoSerie = { ora: string; altezza_m: number };
type PiccoOsservato = { ora: string; altezza_m: number; tipo: "alta" | "bassa" };
type MareeOsservateData = {
  stazione: string;
  aggiornato_al: string;
  picchi: PiccoOsservato[];
  // Serie completa di oggi (non solo i picchi) — aggiunta il 02/10/2026,
  // usata solo dal grafico "Andamento di oggi" (MareeGraficoOggi.tsx).
  serie?: PuntoSerie[];
};

type PiccoPrevisto = { ora: string; altezza_m: number; tipo: "alta" | "bassa" };
type GiornoPrevisto = { data: string; picchi: PiccoPrevisto[] };
type MareePrevisteData = {
  stazione: string;
  aggiornato_al: string;
  fonte: string;
  giorni: GiornoPrevisto[];
  // Curva completa SOLO di oggi (non limitata ai picchi) — stesso motivo
  // di "serie" sopra.
  serieOggi?: PuntoSerie[];
};

function formattaOra(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-GB" : "it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function formattaData(iso: string, locale: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function RigaPicco({
  p,
  locale,
  t,
}: {
  p: { ora: string; altezza_m: number; tipo: "alta" | "bassa" };
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span className="font-mono text-ink-faint w-11 shrink-0">{formattaOra(p.ora, locale)}</span>
      <span className={`flex-1 ${p.tipo === "alta" ? "text-cool-ink" : "text-ink-dim"}`}>
        {p.tipo === "alta" ? t("alta") : t("bassa")}
      </span>
      <span className="font-mono font-bold">
        {p.altezza_m > 0 ? "+" : ""}
        {p.altezza_m} m
      </span>
    </li>
  );
}

export function MareePage() {
  const [osservate, setOsservate] = useState<Partial<Record<string, MareeOsservateData>>>({});
  const [previste, setPreviste] = useState<Partial<Record<string, MareePrevisteData>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("maree");
  const tNav = useTranslations("nav");
  const tAmbiente = useTranslations("ambiente");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const idsOsservate = STAZIONI.map((s) => `maree-osservate:${s.slug}`);
      const idsPreviste = STAZIONI.map((s) => `maree-previste:${s.slug}`);
      const [resOss, resPrev] = await Promise.all([
        supabase.from("snapshots").select("id, data").in("id", idsOsservate),
        supabase.from("snapshots").select("id, data").in("id", idsPreviste),
      ]);
      if (!attivo) return;

      const nessunDato = (resOss.error || !resOss.data || resOss.data.length === 0) &&
        (resPrev.error || !resPrev.data || resPrev.data.length === 0);
      if (nessunDato) {
        setStato("error");
        return;
      }

      const mappaOss: Partial<Record<string, MareeOsservateData>> = {};
      for (const row of resOss.data ?? []) {
        mappaOss[row.id.replace("maree-osservate:", "")] = row.data as MareeOsservateData;
      }
      const mappaPrev: Partial<Record<string, MareePrevisteData>> = {};
      for (const row of resPrev.data ?? []) {
        mappaPrev[row.id.replace("maree-previste:", "")] = row.data as MareePrevisteData;
      }
      setOsservate(mappaOss);
      setPreviste(mappaPrev);
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

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/ambiente" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("ambiente")}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {tAmbiente("sezioni.maree.nome")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("descrizione")}</p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>}

        {stato !== "loading" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
            <Panel title={t("andamentoOggi")} span={3}>
              <MareeGraficoOggi osservate={osservate} previste={previste} />
            </Panel>

            {STAZIONI.map((s) => {
              const oss = osservate[s.slug];
              const prev = previste[s.slug];
              return (
                <Panel key={s.slug} title={s.nome}>
                  <div className="mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-ink-faint mb-2">
                      {t("oggiOsservato")}
                    </div>
                    {oss && oss.picchi.length > 0 ? (
                      <ul className="space-y-1">
                        {oss.picchi.map((p, i) => (
                          <RigaPicco key={i} p={p} locale={locale} t={t} />
                        ))}
                      </ul>
                    ) : (
                      <p className="font-mono text-xs text-ink-faint">{t("nd")}</p>
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-ink-faint mb-2">
                      {t("prossimiGiorni")}
                    </div>
                    {prev && prev.giorni.length > 0 ? (
                      <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1">
                        {prev.giorni.slice(0, 7).map((g) => (
                          <div key={g.data}>
                            <div className="font-mono text-[10px] text-ink-faint capitalize mb-1">
                              {formattaData(g.data, locale)}
                            </div>
                            <ul className="space-y-0.5">
                              {g.picchi.map((p, i) => (
                                <RigaPicco key={i} p={p} locale={locale} t={t} />
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-mono text-xs text-ink-faint">{t("nd")}</p>
                    )}
                  </div>

                  {(oss || prev) && (
                    <div className="mt-3 pt-2 border-t border-line font-mono text-[9px] text-ink-faint">
                      {oss && t("osservatoAgg", { ora: formattaOra(oss.aggiornato_al, locale) })}
                      {oss && prev && " · "}
                      {prev && t("previsioneFonte")}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
