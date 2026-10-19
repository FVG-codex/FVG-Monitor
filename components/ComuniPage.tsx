"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { COMUNI, COMUNI_META, conteggioComuniProvincia, type VoceComune } from "@/lib/comuni";

// Servizi → Comuni (14/10/2026) — vedi lib/comuni.ts per fonte/schema/note
// sulla raccolta. A differenza di Musei/Osmize (più voci per comune), qui
// ogni record È un comune: niente tab comune, solo tab provincia + ricerca
// per nome, come MuseiPage.tsx ma senza il secondo livello.
export function ComuniPage() {
  const [tab, setTab] = useState<ProvinciaSlug>("udine");
  const [ricerca, setRicerca] = useState("");
  const t = useTranslations("comuni");
  const tServizi = useTranslations("servizi");
  const tChrome = useTranslations("chrome");

  const baseProvincia = useMemo(() => COMUNI.filter((c) => c.provincia === tab), [tab]);

  const voci = useMemo(() => {
    let lista = baseProvincia;
    const q = ricerca.trim().toLowerCase();
    if (q) lista = lista.filter((c) => c.nome.toLowerCase().includes(q));
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [baseProvincia, ricerca]);

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const luogo = tChrome("inProvinciaDi", { provincia: nomeProvincia });

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/servizi" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tServizi("titolo")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {t("descrizione", { totale: COMUNI_META.totaleRaccolto })}
        </p>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("disclaimerFonte")}</p>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setTab(p.slug)}
              aria-pressed={tab === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                tab === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome} ({conteggioComuniProvincia(p.slug)})
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
              <div className="max-h-[1200px] overflow-y-auto flex flex-col">
                {voci.map((v, i) => (
                  <ComuneCard key={v.nome} voce={v} bordo={i > 0} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <p className="text-ink-faint text-[10px] font-mono mt-6">
          {t("fonteLabel", { fonte: COMUNI_META.fonte, data: COMUNI_META.dataRaccolta })}
        </p>
      </main>

      <Footer />
    </>
  );
}

function ComuneCard({ voce, bordo }: { voce: VoceComune; bordo: boolean }) {
  const t = useTranslations("comuni");
  return (
    <div className={`py-4 ${bordo ? "border-t border-line" : ""}`}>
      <div className="font-cond font-bold text-base uppercase tracking-wide">{voce.nome}</div>
      <div className="text-ink-dim text-xs mt-0.5">({voce.provinciaSigla})</div>

      <dl className="text-sm mt-2 flex flex-col gap-1">
        {voce.indirizzo && (
          <div>
            <dt className="inline text-ink-faint text-xs font-mono">{t("indirizzoLabel")}: </dt>
            <dd className="inline text-ink">{voce.indirizzo}</dd>
          </div>
        )}
        {voce.telefono && (
          <div>
            <dt className="inline text-ink-faint text-xs font-mono">{t("telefonoLabel")}: </dt>
            <dd className="inline">
              <a href={`tel:${voce.telefono.replace(/\s+/g, "")}`} className="text-cool-ink hover:underline">
                {voce.telefono}
              </a>
            </dd>
          </div>
        )}
        {voce.fax && (
          <div>
            <dt className="inline text-ink-faint text-xs font-mono">{t("faxLabel")}: </dt>
            <dd className="inline text-ink">{voce.fax}</dd>
          </div>
        )}
        {voce.pec && (
          <div>
            <dt className="inline text-ink-faint text-xs font-mono">{t("pecLabel")}: </dt>
            <dd className="inline">
              <a href={`mailto:${voce.pec}`} className="text-cool-ink hover:underline break-all">
                {voce.pec}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {voce.sitoWeb && (
        <div className="mt-2">
          <a
            href={voce.sitoWeb.startsWith("http") ? voce.sitoWeb : `https://${voce.sitoWeb}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-cool-ink underline hover:no-underline"
          >
            {t("visitaSito")}
          </a>
        </div>
      )}

      {!voce.indirizzo && !voce.telefono && !voce.pec && !voce.sitoWeb && (
        <p className="text-ink-faint text-xs mt-2">{t("nonDisponibile")}</p>
      )}

      {voce.note && <p className="text-ink-faint text-[11px] mt-1.5 italic">{voce.note}</p>}
    </div>
  );
}
