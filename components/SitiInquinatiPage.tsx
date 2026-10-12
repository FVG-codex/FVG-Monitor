"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { SITI_INQUINATI_PER_PROVINCIA, type StatoPraticaSito, type VoceSitoInquinato } from "@/lib/sitiinquinati";

// Ambiente → Siti inquinati (12/10/2026) — vedi lib/sitiinquinati.ts per
// fonte/schema/nota sulla chiave univoca. Nessuna mappa (il dataset non
// ha coordinate): stesso scheletro tab provincia → tab comune → ricerca
// già usato in FarmaciePage.tsx, ma un unico Panel a tutta larghezza
// (elenco) invece della coppia Elenco/Mappa affiancata, più un filtro
// aggiuntivo per stato della pratica (Tutti/Istruttoria in atto/
// Archiviata).
const STATI_FILTRO: Array<StatoPraticaSito | "tutti"> = ["tutti", "istruttoria_in_atto", "archiviata"];

export function SitiInquinatiPage() {
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [statoSel, setStatoSel] = useState<StatoPraticaSito | "tutti">("tutti");
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("sitiInquinati");
  const tChrome = useTranslations("chrome");

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }

  const baseProvincia = SITI_INQUINATI_PER_PROVINCIA[tab] ?? [];

  // Comuni presenti nella provincia corrente, con conteggio, in ordine
  // alfabetico — calcolato su baseProvincia (non già filtrato da
  // stato/ricerca), stesso principio di FarmaciePage.tsx: i tastini
  // comune restano stabili mentre si cambia filtro stato o si digita.
  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const v of baseProvincia) {
      conteggio.set(v.comune, (conteggio.get(v.comune) ?? 0) + 1);
    }
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [baseProvincia]);

  const voci = useMemo(() => {
    let lista = baseProvincia;
    if (comuneSel) lista = lista.filter((v) => v.comune === comuneSel);
    if (statoSel !== "tutti") lista = lista.filter((v) => v.statoPratica === statoSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (v) => v.codiceSito.toLowerCase().includes(q) || v.comune.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [baseProvincia, comuneSel, statoSel, ricerca]);

  function conteggioProvincia(p: ProvinciaSlug): number {
    return SITI_INQUINATI_PER_PROVINCIA[p]?.length ?? 0;
  }

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const luogo = comuneSel ? tChrome("aComune", { luogo: comuneSel }) : tChrome("inProvinciaDi", { provincia: nomeProvincia });

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">{t("descrizione")}</p>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("disclaimerArchiviata")}</p>

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
              {tChrome("tuttiIComuni", { count: baseProvincia.length })}
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
          {STATI_FILTRO.map((s) => (
            <button
              key={s}
              onClick={() => setStatoSel(s)}
              aria-pressed={statoSel === s}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                statoSel === s ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {s === "tutti" ? t("statoTutti") : s === "istruttoria_in_atto" ? t("statoIstruttoria") : t("statoArchiviata")}
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
          <Panel title={tChrome("elenco", { count: voci.length })}>
            {voci.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">{t("nessunRisultato", { luogo })}</p>
            ) : (
              <div className="max-h-[640px] overflow-y-auto flex flex-col">
                {voci.map((v, i) => (
                  <SitoRiga key={v.id} voce={v} bordo={i > 0} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}

function SitoRiga({ voce, bordo }: { voce: VoceSitoInquinato; bordo: boolean }) {
  const t = useTranslations("sitiInquinati");
  const inCorso = voce.statoPratica === "istruttoria_in_atto";
  return (
    <div className={`py-3 ${bordo ? "border-t border-line" : ""}`}>
      <div className="flex items-baseline justify-between gap-2 min-w-0 flex-wrap">
        <span className="text-sm font-semibold font-mono truncate">{voce.codiceSito}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full flex-shrink-0 ${inCorso ? "bg-allerta-arancione" : "bg-ink-faint"}`}
          />
          <span className="font-mono text-[10px] text-ink-faint uppercase whitespace-nowrap">
            {inCorso ? t("statoIstruttoria") : t("statoArchiviata")}
          </span>
        </span>
      </div>
      <div className="text-ink-dim text-xs mt-0.5">
        {voce.comune} · {t(`categoria.${voce.categoria}`)}
      </div>
      {voce.stadio && <div className="text-ink-faint text-xs mt-0.5">{t("stadioLabel", { stadio: voce.stadio })}</div>}
      {voce.tipologiaInquinante && (
        <div className="text-ink-faint text-xs mt-0.5">{t("inquinanteLabel", { inquinante: voce.tipologiaInquinante })}</div>
      )}
    </div>
  );
}
