"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { OSMIZE, OSMIZE_META, LOCALITA_OSMIZE, conteggioOsmizeLocalita, type VoceOsmiza } from "@/lib/osmize";

const OsmizeMap = dynamic(() => import("@/components/OsmizeMap").then((m) => m.OsmizeMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

// Turismo → Osmize (13/10/2026) — vedi lib/osmize.ts per fonte/schema/note
// sulla raccolta e per la spiegazione di perché le date di apertura non
// compaiono. Filtro per LOCALITÀ (non provincia/comune: le osmize sono quasi
// tutte nel Carso triestino, un filtro provincia non avrebbe senso — vedi
// lib/osmize.ts) + ricerca + pannelli Elenco/Mappa, stesso scheletro di
// ParchiGiardiniPage.tsx ma su dataset statico.
const CENTRO_CARSO: [number, number] = [45.68, 13.75];

export function OsmizePage() {
  const [localitaSel, setLocalitaSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("osmize");
  const tChrome = useTranslations("chrome");

  const voci = useMemo(() => {
    let lista = OSMIZE;
    if (localitaSel) lista = lista.filter((o) => o.localita === localitaSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (o) =>
          o.nome.toLowerCase().includes(q) ||
          o.localita.toLowerCase().includes(q) ||
          (o.indirizzo ?? "").toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [localitaSel, ricerca]);

  const luogo = localitaSel ? tChrome("aComune", { luogo: localitaSel }) : t("tutteLeLocalita");

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">{t("descrizione", { totale: OSMIZE_META.totaleRaccolto })}</p>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("disclaimerDateApertura")}</p>

        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setLocalitaSel(null)}
            aria-pressed={localitaSel === null}
            className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              localitaSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t("tutteLeLocalita")} ({OSMIZE.length})
          </button>
          {LOCALITA_OSMIZE.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocalitaSel(loc)}
              aria-pressed={localitaSel === loc}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                localitaSel === loc ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {loc} ({conteggioOsmizeLocalita(loc)})
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
          <Panel title={tChrome("elenco", { count: voci.length })}>
            {voci.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">{t("nessunRisultato", { luogo })}</p>
            ) : (
              <div className="max-h-[620px] overflow-y-auto flex flex-col">
                {voci.map((v, i) => (
                  <OsmizaCard key={v.url} voce={v} bordo={i > 0} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title={tChrome("mappa")}>
            <div
              role="region"
              aria-label={t("mappaAriaLabel", { luogo })}
              style={{ height: 620 }}
              className="rounded overflow-hidden"
            >
              <OsmizeMap voci={voci} centro={CENTRO_CARSO} />
            </div>
          </Panel>
        </div>

        <p className="text-ink-faint text-[10px] font-mono mt-6">
          {t("fonteLabel", { fonte: OSMIZE_META.fonte, data: OSMIZE_META.dataRaccolta })}
        </p>
      </main>

      <Footer />
    </>
  );
}

function OsmizaCard({ voce, bordo }: { voce: VoceOsmiza; bordo: boolean }) {
  const t = useTranslations("osmize");
  return (
    <div className={`py-4 ${bordo ? "border-t border-line" : ""}`}>
      <div className="font-cond font-bold text-base uppercase tracking-wide">{voce.nome}</div>
      <div className="text-ink-dim text-xs mt-0.5">
        {voce.localita}
        {voce.indirizzo ? ` — ${voce.indirizzo}` : ""}
      </div>

      <p className="text-ink text-sm mt-2 leading-relaxed">{voce.descrizione}</p>

      {voce.prodotti && <p className="text-ink-dim text-xs mt-2 leading-relaxed">{t("prodottiLabel")}: {voce.prodotti}</p>}

      <div className="text-ink-faint text-xs mt-2 font-mono flex flex-wrap gap-x-3">
        {voce.telefono && <span>☎ {voce.telefono}</span>}
        {voce.email && <span>{voce.email}</span>}
      </div>

      <div className="mt-1.5">
        <a
          href={voce.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-cool-ink underline hover:no-underline"
        >
          {t("schedaUfficiale")}
        </a>
      </div>

      {voce.note && <p className="text-ink-faint text-[11px] mt-1.5 italic">{voce.note}</p>}
    </div>
  );
}
