"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { BLSD, BLSD_META, conteggioBlsdProvincia, type VoceBlsd } from "@/lib/blsd";

// Sanità → DAE/BLSD (15/10/2026) — vedi lib/blsd.ts per fonte/schema/note
// sulla raccolta e sui suoi limiti. Stesso scheletro tab provincia → tab
// comune → ricerca di MuseiPage.tsx/SitiInquinatiPage.tsx, ma ogni scheda
// mostra anche tipo di accesso, al coperto/esterno, orario ed eventuale
// posizione approssimata — informazioni di sicurezza, non solo descrittive.
export function BlsdPage() {
  const [tab, setTab] = useState<ProvinciaSlug>("udine");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("blsd");
  const tNav = useTranslations("nav");
  const tChrome = useTranslations("chrome");

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }

  const baseProvincia = useMemo(() => BLSD.filter((b) => b.provincia === tab), [tab]);

  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const b of baseProvincia) {
      conteggio.set(b.comune, (conteggio.get(b.comune) ?? 0) + 1);
    }
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [baseProvincia]);

  const voci = useMemo(() => {
    let lista = baseProvincia;
    if (comuneSel) lista = lista.filter((b) => b.comune === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (b) => b.comune.toLowerCase().includes(q) || (b.indirizzo ?? "").toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => a.comune.localeCompare(b.comune, "it") || a.osmId - b.osmId);
  }, [baseProvincia, comuneSel, ricerca]);

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const luogo = comuneSel ? tChrome("aComune", { luogo: comuneSel }) : tChrome("inProvinciaDi", { provincia: nomeProvincia });

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/sanita" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("sanita")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {t("descrizione", { totale: BLSD_META.totaleRegione })}
        </p>
        <p className="text-amber-700 dark:text-amber-400 text-xs font-mono mb-6 leading-relaxed max-w-3xl">
          ⚠ {t("disclaimerFonte")}
        </p>

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
              {p.nome} ({conteggioBlsdProvincia(p.slug)})
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
              <div className="max-h-[1200px] overflow-y-auto flex flex-col">
                {voci.map((v, i) => (
                  <BlsdCard key={v.osmId} voce={v} bordo={i > 0} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <p className="text-ink-faint text-[10px] font-mono mt-6 max-w-3xl leading-relaxed">
          {t("fonteLabel", { fonte: BLSD_META.fonte, data: BLSD_META.dataRaccolta })}
        </p>
      </main>

      <Footer />
    </>
  );
}

function BlsdCard({ voce, bordo }: { voce: VoceBlsd; bordo: boolean }) {
  const t = useTranslations("blsd");
  return (
    <div className={`py-4 ${bordo ? "border-t border-line" : ""}`}>
      <div className="font-cond font-bold text-base uppercase tracking-wide">
        {voce.nome || t("senzaNome")}
      </div>
      <div className="text-ink-dim text-xs mt-0.5">
        {voce.comune} ({voce.provinciaSigla})
      </div>

      {voce.indirizzo && <p className="text-ink text-sm mt-2">{voce.indirizzo}</p>}
      {voce.posizioneDescrizione && (
        <p className="text-ink-faint text-xs mt-1 italic leading-relaxed">{voce.posizioneDescrizione}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 font-mono text-ink-faint">
        <span>
          {t("accessoLabel")}: {voce.accesso ? t(`accessoValori.${voce.accesso}`) : t("nonNoto")}
        </span>
        <span>
          {t("posizioneLabel")}:{" "}
          {voce.alCoperto === null ? t("nonNoto") : voce.alCoperto ? t("alCoperto") : t("allesterno")}
        </span>
        {voce.orario && <span>{t("orarioLabel")}: {voce.orario}</span>}
        {voce.operatore && <span>{t("operatoreLabel")}: {voce.operatore}</span>}
      </div>

      {voce.telefono && (
        <p className="text-sm mt-1.5">
          <a href={`tel:${voce.telefono.replace(/\s+/g, "")}`} className="text-cool-ink hover:underline">
            {voce.telefono}
          </a>
        </p>
      )}

      {voce.posizioneApprossimata && (
        <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-1.5">⚠ {t("posizioneApprossimataAvviso")}</p>
      )}

      <div className="flex flex-wrap gap-3 mt-2">
        {voce.ultimaVerifica && (
          <span className="text-[10px] font-mono text-ink-faint">{t("ultimaVerificaLabel", { data: voce.ultimaVerifica })}</span>
        )}
        <a
          href={voce.osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-cool-ink underline hover:no-underline"
        >
          {t("vediSuOsm")}
        </a>
      </div>
    </div>
  );
}
