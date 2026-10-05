"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { MeteoOverview, MeteoDettaglio } from "@/components/MeteoPanel";
import { MeteoWidgetSlot } from "@/components/MeteoWidgetSlot";
import { SoleLunaPanel } from "@/components/SoleLunaPanel";
import { TemperaturaBadge } from "@/components/TemperaturaBadge";
import { VentoPanel } from "@/components/VentoPanel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { RadarMeteoPanel } from "@/components/RadarMeteoPanel";
import { PazziTelegramPanel } from "@/components/PazziTelegramPanel";
import { PazziPrevisioniPanel } from "@/components/PazziPrevisioniPanel";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

export function MeteoPage() {
  const [filtro, setFiltro] = useState<ProvinciaSlug | "tutte">("tutte");
  const provincia = filtro !== "tutte" ? PROVINCE[filtro] : null;
  const t = useTranslations("meteo");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");
  const tChrome = useTranslations("chrome");
  const tProvincia = useTranslations("provincia");

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("meteo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("descrizione")}</p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFiltro("tutte")}
            aria-pressed={filtro === "tutte"}
            className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              filtro === "tutte" ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {tChrome("allRegion")}
          </button>
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setFiltro(p.slug)}
              aria-pressed={filtro === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                filtro === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        {filtro === "tutte" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
            <Panel title={tHome("panels.meteo")} linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it">
              <MeteoOverview />
            </Panel>

            <Panel
              title={t("radarMeteo")}
              linkLabel="Protezione Civile FVG →"
              linkHref="https://monitor.protezionecivile.fvg.it"
            >
              <RadarMeteoPanel />
            </Panel>

            <Panel
              title="Pazzi per il meteo · Telegram"
              linkLabel={t("canaleTelegramLink")}
              linkHref="https://t.me/pazziperilmeteo"
            >
              <PazziTelegramPanel />
            </Panel>

            <Panel
              title={t("previsioniTemporalesche")}
              linkLabel="Pazzi per il meteo Goriziano →"
              linkHref="https://pazziperilmeteo.fvg.it/category/previsioni-temporalesche/"
            >
              <PazziPrevisioniPanel />
            </Panel>

            <Panel
              title={tHome("ambiente.bora")}
              linkLabel="Protezione Civile FVG →"
              linkHref="https://monitor.protezionecivile.fvg.it"
            >
              <VentoPanel compatto />
              <div className="border-t border-line my-4" />
              <PioggiaPanel compatto />
            </Panel>

            <Panel title={tHome("panels.soleLuna")}>
              <SoleLunaPanel />
            </Panel>
          </div>
        ) : (
          provincia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={t("bollettino")} linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it">
                <MeteoDettaglio provincia={filtro as ProvinciaSlug} />
              </Panel>

              <Panel title={tProvincia("condizioniLive", { provincia: provincia.nome })}>
                <TemperaturaBadge provincia={filtro as ProvinciaSlug} size="lg" />
                <div className="mt-3">
                  <MeteoWidgetSlot slug={filtro as ProvinciaSlug} cittaNome={provincia.nome} />
                </div>
              </Panel>

              <Panel
                title={tProvincia("vento")}
                linkLabel="Protezione Civile FVG →"
                linkHref="https://monitor.protezionecivile.fvg.it"
              >
                <VentoPanel provincia={filtro as ProvinciaSlug} />
              </Panel>

              <Panel
                title={tProvincia("pioggia")}
                linkLabel="Protezione Civile FVG →"
                linkHref="https://monitor.protezionecivile.fvg.it"
              >
                <PioggiaPanel provincia={filtro as ProvinciaSlug} />
              </Panel>

              <Panel title={tHome("panels.soleLuna")} span={2}>
                <SoleLunaPanel />
              </Panel>
            </div>
          )
        )}
      </main>

      <Footer />
    </>
  );
}
