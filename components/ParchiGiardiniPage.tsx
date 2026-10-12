"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  type SnapshotParchiGiardini,
  TIPI_PARCHI_GIARDINI_FILTRO,
  type TipoParcoGiardinoFiltro,
} from "@/lib/parchigiardini";

const ParchiGiardiniMap = dynamic(() => import("@/components/ParchiGiardiniMap").then((m) => m.ParchiGiardiniMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

// Parchi e giardini (storici) — stesso scheletro provincia → comune →
// ricerca + pannelli Elenco/Mappa già rodato in FarmaciePage.tsx/
// GuardieMedichePage.tsx, con un filtro aggiuntivo per tipologia
// (giardino/parco/uccellanda/orto botanico — vedi lib/parchigiardini.ts)
// invece del badge aperta/chiusa, che qui non ha senso.
export function ParchiGiardiniPage() {
  const [dati, setDati] = useState<SnapshotParchiGiardini | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [tipoSel, setTipoSel] = useState<TipoParcoGiardinoFiltro | null>(null);
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("parchiGiardini");
  const tChrome = useTranslations("chrome");

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "parchigiardini").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotParchiGiardini);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const provincia = dati?.per_provincia[tab];
  const tutteLaProvincia = provincia?.voci ?? [];

  // Base per i tastini tipo: filtrata solo per provincia, non ancora
  // per comune/ricerca/tipo — stesso principio dei conteggi comune in
  // FarmaciePage.tsx.
  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const v of tutteLaProvincia) {
      conteggio.set(v.comune, (conteggio.get(v.comune) ?? 0) + 1);
    }
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [tutteLaProvincia]);

  const voci = useMemo(() => {
    let lista = tutteLaProvincia;
    if (comuneSel) lista = lista.filter((v) => v.comune === comuneSel);
    if (tipoSel) lista = lista.filter((v) => v.tipi.includes(tipoSel));
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (v) =>
          v.nome.toLowerCase().includes(q) ||
          v.comune.toLowerCase().includes(q) ||
          (v.localita ?? "").toLowerCase().includes(q)
      );
    }
    return lista;
  }, [tutteLaProvincia, comuneSel, tipoSel, ricerca]);

  function conteggioProvincia(p: ProvinciaSlug): number {
    return dati?.per_provincia[p]?.totale ?? 0;
  }

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const centroProvincia: Record<ProvinciaSlug, [number, number]> = {
    trieste: [45.65, 13.78],
    udine: [46.06, 13.24],
    gorizia: [45.94, 13.62],
    pordenone: [45.96, 12.66],
  };

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("descrizione")}</p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>}

        {stato === "ready" && dati && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => selezionaProvincia(p.slug)}
                  aria-pressed={tab === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    tab === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({conteggioProvincia(p.slug)})
                </button>
              ))}
            </div>

            {comuni.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setComuneSel(null)}
                  aria-pressed={comuneSel === null}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    comuneSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {tChrome("tuttiIComuni", { count: tutteLaProvincia.length })}
                </button>
                {comuni.map(([c, n]) => (
                  <button
                    key={c}
                    onClick={() => setComuneSel(c)}
                    aria-pressed={comuneSel === c}
                    className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                      comuneSel === c ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                    }`}
                  >
                    {c} ({n})
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setTipoSel(null)}
                aria-pressed={tipoSel === null}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  tipoSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {t("tipoTutti")}
              </button>
              {TIPI_PARCHI_GIARDINI_FILTRO.map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTipoSel(tp)}
                  aria-pressed={tipoSel === tp}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    tipoSel === tp ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {t(`tipo.${tp}`)}
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
              <Panel title={tChrome("elenco", { count: voci.length })}>
                {voci.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    {t("nessunaTrovata", {
                      luogo: comuneSel
                        ? tChrome("aComune", { luogo: comuneSel })
                        : tChrome("inProvinciaDi", { provincia: nomeProvincia }),
                    })}
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {voci.map((v, i) => (
                      <div key={`${v.pk}-${i}`} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{v.nome}</span>
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5 capitalize">{v.tipoEtichetta.replace(/\//g, " · ")}</div>
                        <div className="text-ink-faint text-xs mt-0.5">
                          {v.comune}
                          {v.localita ? ` — ${v.localita}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title={tChrome("mappa")}>
                <div
                  role="region"
                  aria-label={t("mappaAriaLabel", {
                    luogo: comuneSel
                      ? tChrome("aComune", { luogo: comuneSel })
                      : tChrome("inProvinciaDi", { provincia: nomeProvincia }),
                  })}
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <ParchiGiardiniMap voci={voci} centro={centroProvincia[tab]} />
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
