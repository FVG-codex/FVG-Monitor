"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { AVIOSTRUTTURE } from "@/lib/aviostrutture";
import type { CategoriaAviostruttura } from "@/lib/aviostrutture";

const AviazioneMap = dynamic(() => import("@/components/AviazioneMap").then((m) => m.AviazioneMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

const FILTRI: (CategoriaAviostruttura | "tutte")[] = [
  "tutte",
  "aeroporto-civile",
  "aeroporto-militare",
  "aviosuperficie",
  "campo-volo",
  "elisuperficie",
  "pista-dismessa",
];

function contaPerCategoria(cat: CategoriaAviostruttura | "tutte"): number {
  return cat === "tutte" ? AVIOSTRUTTURE.length : AVIOSTRUTTURE.filter((s) => s.categoria === cat).length;
}

export function AviazionePage() {
  const [filtro, setFiltro] = useState<CategoriaAviostruttura | "tutte">("tutte");
  const t = useTranslations("aviazione");
  const tNav = useTranslations("nav");
  const tChrome = useTranslations("chrome");

  const strutture = (filtro === "tutte" ? AVIOSTRUTTURE : AVIOSTRUTTURE.filter((s) => s.categoria === filtro))
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("aviazione")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {t("descrizione", { count: AVIOSTRUTTURE.length })}
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {FILTRI.map((chiave) => (
            <button
              key={chiave}
              onClick={() => setFiltro(chiave)}
              aria-pressed={filtro === chiave}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                filtro === chiave ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {t(`filtri.${chiave}`)} ({contaPerCategoria(chiave)})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
          <Panel title={tChrome("mappa")}>
            {/* role="region" + aria-label (stesso pattern di TerremotiPage.tsx,
                Fase 4 — Accessibilità): la mappa Leaflet non è navigabile in
                modo significativo con uno screen reader — gli stessi dati
                sono comunque disponibili per intero, in forma testuale, nel
                pannello "Elenco" qui accanto. */}
            <div
              role="region"
              aria-label={t("mappaAriaLabel")}
              style={{ height: 460 }}
              className="rounded overflow-hidden"
            >
              <AviazioneMap strutture={strutture} centro={[46.05, 13.1]} />
            </div>
          </Panel>

          <Panel title={t("elenco", { count: strutture.length })}>
            {strutture.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">{t("nessunaStruttura")}</p>
            ) : (
              <div className="max-h-[460px] overflow-y-auto flex flex-col">
                {strutture.map((s, i) => (
                  <div key={s.urlFonte ?? s.nome} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{s.nome}</span>
                      <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                        {s.provincia}
                        {s.codice ? ` · ${s.codice}` : ""}
                        {s.icao ? ` · ${s.icao}` : ""}
                      </span>
                    </div>
                    <div className="text-ink-dim text-xs mt-0.5">
                      {s.comune}
                      {s.localita ? ` (${s.localita})` : ""} — {s.tipo}
                    </div>
                    {(s.categorieVolo.length > 0 || s.quotaM !== null) && (
                      <div className="font-mono text-[10px] text-ink-faint mt-1 uppercase">
                        {s.categorieVolo.join(" · ")}
                        {s.categorieVolo.length > 0 && s.quotaM !== null ? " · " : ""}
                        {s.quotaM !== null ? `Quota ${s.quotaM} m` : ""}
                      </div>
                    )}
                    {s.pisteDettaglio && s.pisteDettaglio.length > 0 && (
                      <div className="font-mono text-[10px] text-ink-dim mt-1">
                        {s.pisteDettaglio.map((p, pi) => (
                          <div key={pi}>
                            Pista {p.orientamento}
                            {p.lunghezzaM !== null ? ` · ${p.lunghezzaM} m` : ""}
                            {p.pavimentazione ? ` · ${p.pavimentazione}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {s.urlFonte && (
                        <a
                          href={s.urlFonte}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-cool-ink hover:underline inline-block"
                        >
                          {t("schedaLink")}<span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
                        </a>
                      )}
                      {s.fonteDatiPista && s.fonteDatiPista !== s.urlFonte && (
                        <a
                          href={s.fonteDatiPista}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-cool-ink hover:underline inline-block"
                        >
                          {t("datiPistaLink")}<span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
                        </a>
                      )}
                    </div>
                  </div>
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
