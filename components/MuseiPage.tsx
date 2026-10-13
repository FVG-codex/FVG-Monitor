"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { MUSEI, MUSEI_META, conteggioMuseiProvincia, type VoceMuseo } from "@/lib/musei";

// Turismo → Musei (13/10/2026) — vedi lib/musei.ts per fonte/schema/note
// sulla raccolta. Nessuna mappa (la fonte non riporta coordinate per le
// schede-museo): stesso scheletro tab provincia → tab comune → ricerca già
// usato in SitiInquinatiPage.tsx, ma con card più ricche di contenuto
// (descrizione, siti web, link alla scheda ufficiale ERPAC) invece di righe
// compatte, dato che qui il contenuto principale è testuale/discorsivo.
// Un'unica voce ha provincia non specificata nella fonte ("Collezione della
// Regione Autonoma Friuli Venezia Giulia", distribuita su più sedi): tab
// dedicato "Non specificata" invece di escluderla o forzarle una provincia.
const PROVINCIA_NON_SPECIFICATA = "non_specificata" as const;
type TabProvincia = ProvinciaSlug | typeof PROVINCIA_NON_SPECIFICATA;

export function MuseiPage() {
  const museiNonSpecificati = useMemo(() => MUSEI.filter((m) => m.provincia === null), []);
  const [tab, setTab] = useState<TabProvincia>("udine");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("musei");
  const tChrome = useTranslations("chrome");

  function selezionaProvincia(p: TabProvincia) {
    setTab(p);
    setComuneSel(null);
  }

  const baseProvincia = tab === PROVINCIA_NON_SPECIFICATA ? museiNonSpecificati : MUSEI.filter((m) => m.provincia === tab);

  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const m of baseProvincia) {
      if (!m.comune) continue;
      conteggio.set(m.comune, (conteggio.get(m.comune) ?? 0) + 1);
    }
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [baseProvincia]);

  const voci = useMemo(() => {
    let lista = baseProvincia;
    if (comuneSel) lista = lista.filter((m) => m.comune === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (m) => m.nome.toLowerCase().includes(q) || (m.comune ?? "").toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [baseProvincia, comuneSel, ricerca]);

  const nomeProvincia =
    tab === PROVINCIA_NON_SPECIFICATA ? t("provinciaNonSpecificata") : PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const luogo = comuneSel ? tChrome("aComune", { luogo: comuneSel }) : tChrome("inProvinciaDi", { provincia: nomeProvincia });

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {t("descrizione", { totale: MUSEI_META.totaleRaccolto })}
        </p>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("disclaimerOrariBiglietti")}</p>

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
              {p.nome} ({conteggioMuseiProvincia(p.slug)})
            </button>
          ))}
          {museiNonSpecificati.length > 0 && (
            <button
              onClick={() => selezionaProvincia(PROVINCIA_NON_SPECIFICATA)}
              aria-pressed={tab === PROVINCIA_NON_SPECIFICATA}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                tab === PROVINCIA_NON_SPECIFICATA ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {t("provinciaNonSpecificata")} ({museiNonSpecificati.length})
            </button>
          )}
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
                  <MuseoCard key={v.sId} voce={v} bordo={i > 0} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <p className="text-ink-faint text-[10px] font-mono mt-6">
          {t("fonteLabel", { fonte: MUSEI_META.fonte, data: MUSEI_META.dataRaccolta })}
        </p>
      </main>

      <Footer />
    </>
  );
}

function MuseoCard({ voce, bordo }: { voce: VoceMuseo; bordo: boolean }) {
  const t = useTranslations("musei");
  return (
    <div className={`py-4 ${bordo ? "border-t border-line" : ""}`}>
      <div className="font-cond font-bold text-base uppercase tracking-wide">{voce.nome}</div>
      {voce.comune && (
        <div className="text-ink-dim text-xs mt-0.5">
          {voce.comune}
          {voce.provinciaSigla ? ` (${voce.provinciaSigla})` : ""}
        </div>
      )}
      <p className="text-ink text-sm mt-2 leading-relaxed">{voce.descrizione}</p>

      <div className="text-ink-faint text-xs mt-2 font-mono">
        {t("orariLabel")}: {voce.orari ?? t("nonDisponibileCatalogo")}
        {" · "}
        {t("bigliettiLabel")}: {voce.biglietti ?? t("nonDisponibileCatalogo")}
      </div>

      {voce.sitiWeb.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {voce.sitiWeb.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-cool-ink underline hover:no-underline break-all"
            >
              {t("visitaIlSito")}
            </a>
          ))}
        </div>
      )}

      <div className="mt-1.5">
        <a
          href={voce.schedaErpac}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-ink-faint underline hover:no-underline"
        >
          {t("schedaUfficiale")}
        </a>
      </div>

      {voce.note && <p className="text-ink-faint text-[11px] mt-1.5 italic">{voce.note}</p>}
    </div>
  );
}
