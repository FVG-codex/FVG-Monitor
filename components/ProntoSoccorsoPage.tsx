"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  type SnapshotProntoSoccorso,
  type DipartimentoPS,
  provinciaDipartimento,
  telefonoDipartimento,
  telHref,
  mapsDirectionsHref,
  totaliDipartimento,
  stileBadgeColore,
  formattaOraAggiornamento,
  datoObsoleto,
} from "@/lib/prontosoccorso";

const ProntoSoccorsoMap = dynamic(() => import("@/components/ProntoSoccorsoMap").then((m) => m.ProntoSoccorsoMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

const CENTRO_PROVINCIA: Record<ProvinciaSlug, [number, number]> = {
  trieste: [45.65, 13.78],
  udine: [46.06, 13.24],
  gorizia: [45.94, 13.62],
  pordenone: [45.96, 12.66],
};
const CENTRO_REGIONE: [number, number] = [46.0, 13.15];

// Sanità → Pronto Soccorso (16/09/2026, vedi commento esteso in
// lib/prontosoccorso.ts). A differenza di Farmacie/Veterinari, il
// filtro provincia qui parte da "Tutte le sedi" (non da una provincia
// specifica): il punto centrale di questa pagina è il confronto rapido
// tra le sedi di tutta la regione, non la ricerca di una sede vicina —
// stesso principio già usato per "Tutti i comuni" nei filtri comune di
// Farmacie/Veterinari, applicato qui al primo livello di filtro.
export function ProntoSoccorsoPage() {
  const [dati, setDati] = useState<SnapshotProntoSoccorso | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [provinciaSel, setProvinciaSel] = useState<ProvinciaSlug | null>(null);
  const [ricerca, setRicerca] = useState("");
  const [adesso, setAdesso] = useState(() => Date.now());
  const t = useTranslations("prontoSoccorso");
  const tNav = useTranslations("nav");
  const tSanita = useTranslations("sanita");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "pronto-soccorso").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotProntoSoccorso);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAdesso(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const dipartimenti = dati?.dipartimenti ?? [];

  const conteggioProvincia = useMemo(() => {
    const conteggio = new Map<ProvinciaSlug, number>();
    for (const d of dipartimenti) {
      const p = provinciaDipartimento(d);
      if (p) conteggio.set(p, (conteggio.get(p) ?? 0) + 1);
    }
    return conteggio;
  }, [dipartimenti]);

  const elenco = useMemo(() => {
    let lista = dipartimenti;
    if (provinciaSel) lista = lista.filter((d) => provinciaDipartimento(d) === provinciaSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter((d) => d.nome.toLowerCase().includes(q) || (d.comune ?? "").toLowerCase().includes(q));
    }
    return lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [dipartimenti, provinciaSel, ricerca]);

  const nomeProvincia = provinciaSel ? PROVINCE[provinciaSel].nome : null;
  const centro = provinciaSel ? CENTRO_PROVINCIA[provinciaSel] : CENTRO_REGIONE;
  const obsoleto = dati ? datoObsoleto(dati.dataAggiornamento) : false;
  // adesso è usato solo per forzare il ricalcolo periodico di `obsoleto`
  // sopra (il valore letto è quello di `dati`, non `adesso` stesso).
  void adesso;

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/sanita" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("sanita")}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {tSanita("sezioni.prontoSoccorso.nome")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-1">{t("descrizione")}</p>
        {dati && (
          <p className={`text-xs font-mono mb-4 ${obsoleto ? "text-allerta-arancione-ink" : "text-ink-faint"}`}>
            {t("aggiornatoAlle", { ora: formattaOraAggiornamento(dati.dataAggiornamento) })}
            {obsoleto && t("datoObsoleto")}
          </p>
        )}

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>
        )}

        {stato === "ready" && dati && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setProvinciaSel(null)}
                aria-pressed={provinciaSel === null}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  provinciaSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {t("tutteLeSedi", { count: dipartimenti.length })}
              </button>
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setProvinciaSel(p.slug)}
                  aria-pressed={provinciaSel === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    provinciaSel === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({conteggioProvincia.get(p.slug) ?? 0})
                </button>
              ))}
            </div>

            <label className="block mb-4">
              <span className="sr-only">{tChrome("cercaNomeComuneLabel")}</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder={tChrome("cercaNomeComunePlaceholder")}
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={tChrome("elenco", { count: elenco.length })}>
                {elenco.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    {t("nessunaSede", {
                      luogo: nomeProvincia ? tChrome("inProvinciaDi", { provincia: nomeProvincia }) : "",
                    })}
                  </p>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto flex flex-col">
                    {elenco.map((d, i) => {
                      const { inAttesa, inTrattamento } = totaliDipartimento(d);
                      const telefono = telefonoDipartimento(d);
                      const indicazioni = mapsDirectionsHref(d);
                      return (
                        <div key={d.id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{d.nome}</span>
                          </div>
                          {d.info && <div className="text-ink-faint text-[10px] font-mono mt-0.5">{d.info}</div>}
                          <div className="text-ink-dim text-xs mt-0.5">
                            {d.indirizzo}
                            {d.indirizzo && d.comune ? ", " : ""}
                            {d.comune}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {telefono ? (
                              <a href={`tel:${telHref(telefono)}`} className="text-xs text-cool-ink hover:underline">
                                📞 {telefono}
                              </a>
                            ) : (
                              <span className="text-ink-faint text-[10px] font-mono uppercase">
                                {t("telefonoNonDisponibile")}
                              </span>
                            )}
                            {indicazioni && (
                              <a
                                href={indicazioni}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-cool-ink hover:underline"
                              >
                                {t("indicazioniLink")}<span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
                              </a>
                            )}
                          </div>

                          <div className="flex gap-4 mt-2 text-sm">
                            <span>
                              <strong className="text-base">{inAttesa}</strong>{" "}
                              <span className="text-ink-faint text-[10px] font-mono uppercase">{t("inAttesa")}</span>
                            </span>
                            <span>
                              <strong className="text-base">{inTrattamento}</strong>{" "}
                              <span className="text-ink-faint text-[10px] font-mono uppercase">{t("inTrattamento")}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-1 mt-2">
                            {d.codiciColore.map((c) => (
                              <div
                                key={c.id}
                                style={stileBadgeColore(c)}
                                className="rounded px-1.5 py-1 border text-[10px] leading-tight"
                              >
                                <div className="font-cond font-bold uppercase tracking-wide">{c.descrizione}</div>
                                <div>
                                  {c.situazionePazienti.numeroPazientiInAttesa} {t("abbrAttesa")} ·{" "}
                                  {c.situazionePazienti.numeroPazientiInVisita} {t("abbrTrattamento")}
                                </div>
                                <div>{t("attesaMedia", { valore: c.situazionePazienti.mediaAttesa })}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title={tChrome("mappa")}>
                <div
                  role="region"
                  aria-label={t("mappaAriaLabel", {
                    luogo: nomeProvincia
                      ? tChrome("inProvinciaDi", { provincia: nomeProvincia })
                      : t("delFriuliVeneziaGiulia"),
                  })}
                  style={{ height: 600 }}
                  className="rounded overflow-hidden"
                >
                  <ProntoSoccorsoMap dipartimenti={elenco} centro={centro} />
                </div>
              </Panel>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
