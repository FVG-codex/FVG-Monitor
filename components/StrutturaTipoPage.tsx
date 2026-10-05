"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  PROVINCIA_ABBR,
  type TipoStrutturaSlug,
  type SnapshotStruttureRicettive,
} from "@/lib/struttureRicettive";

export function StrutturaTipoPage({ tipo }: { tipo: TipoStrutturaSlug }) {
  const [dati, setDati] = useState<SnapshotStruttureRicettive | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [provincia, setProvincia] = useState<ProvinciaSlug | "tutte">("tutte");
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("struttureRicettive");
  const tTurismo = useTranslations("turismo");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "strutture-ricettive").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotStruttureRicettive);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const datiTipo = dati?.tipi[tipo];

  // min-w-0 sul contenitore flex della riga sotto (lezione permanente
  // Fase 4 — Responsive): qui non serve, nessun elemento è troncato con
  // `truncate`, ma la struttura della riga segue lo stesso schema di
  // AviazionePage per coerenza visiva.
  const elenco = useMemo(() => {
    if (!datiTipo) return [];
    const province: ProvinciaSlug[] = provincia === "tutte" ? PROVINCE_LIST.map((p) => p.slug) : [provincia];
    const voci = province.flatMap((p) => (datiTipo.per_provincia[p] ?? []).map((v) => ({ ...v, provincia: p })));
    const q = ricerca.trim().toLowerCase();
    const filtrate = q
      ? voci.filter((v) => v.nome.toLowerCase().includes(q) || (v.comune ?? "").toLowerCase().includes(q))
      : voci;
    return filtrate.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [datiTipo, provincia, ricerca]);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/strutture-ricettive" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tTurismo("sezioni.struttureRicettive.nome")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{t(`tipi.${tipo}.nome`)}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {t("descrizioneDettaglio", { descrizione: t(`tipi.${tipo}.descrizioneCompleta`) })}
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>}

        {stato === "ready" && dati && datiTipo && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setProvincia("tutte")}
                aria-pressed={provincia === "tutte"}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  provincia === "tutte" ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {t("tutte", { count: datiTipo.totale })}
              </button>
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setProvincia(p.slug)}
                  aria-pressed={provincia === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    provincia === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({(datiTipo.per_provincia[p.slug] ?? []).length})
                </button>
              ))}
            </div>

            <label className="block mb-4">
              <span className="sr-only">{t("cercaLabel")}</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder={t("cercaPlaceholder")}
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 gap-px bg-line border border-line">
              <Panel title={t("elenco", { count: elenco.length })}>
                {elenco.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">{t("nessunaStruttura")}</p>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto flex flex-col">
                    {elenco.map((v, i) => (
                      <div key={`${v.nome}-${i}`} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{v.nome}</span>
                          <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                            {PROVINCIA_ABBR[v.provincia]}
                          </span>
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5">{v.comune}</div>
                        {v.contatti?.indirizzo && (
                          <div className="text-ink-faint text-[11px] mt-0.5">
                            {v.contatti.indirizzo}
                            <span className="font-mono text-[9px] text-ink-faint uppercase ml-1">
                              ({v.contatti.fonte === "turismofvg" ? "TurismoFVG" : "OSM"})
                            </span>
                          </div>
                        )}
                        {(v.sito || v.email || v.contatti?.telefono || v.contatti?.sito || v.contatti?.email) && (
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {v.contatti?.telefono && (
                              <a
                                href={`tel:${v.contatti.telefono.replace(/\s+/g, "")}`}
                                className="font-mono text-[10px] text-ink-faint hover:text-cool-ink"
                              >
                                {v.contatti.telefono}
                                <span className="text-[9px] uppercase ml-1">
                                  ({v.contatti.fonte === "turismofvg" ? "TurismoFVG" : "OSM"})
                                </span>
                              </a>
                            )}
                            {(v.sito || v.contatti?.sito) && (
                              <a
                                href={v.sito ?? v.contatti?.sito}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-cool-ink hover:underline inline-block"
                              >
                                {t("sitoLink")}<span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
                              </a>
                            )}
                            {(v.email || v.contatti?.email) && (
                              <a
                                href={`mailto:${v.email ?? v.contatti?.email}`}
                                className="font-mono text-[10px] text-ink-faint hover:text-cool-ink"
                              >
                                {v.email ?? v.contatti?.email}
                              </a>
                            )}
                          </div>
                        )}
                        {(v.contatti?.titolare || v.contatti?.cin) && (
                          <div className="text-ink-faint text-[10px] font-mono mt-1">
                            {v.contatti.titolare && <span>{t("titolare", { nome: v.contatti.titolare })}</span>}
                            {v.contatti.titolare && v.contatti.cin && <span className="mx-1.5">·</span>}
                            {v.contatti.cin && <span>CIN: {v.contatti.cin}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <p className="text-ink-faint text-[10px] font-mono mt-3">
              {t("aggiornatoAl", {
                data: new Date(dati.aggiornato_al).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
