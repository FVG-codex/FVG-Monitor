"use client";

import { useState } from "react";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { MeteoOverview, MeteoDettaglio } from "@/components/MeteoPanel";
import { MeteoWidgetSlot } from "@/components/MeteoWidgetSlot";
import { TemperaturaBadge } from "@/components/TemperaturaBadge";
import { VentoPanel } from "@/components/VentoPanel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { RadarMeteoPanel } from "@/components/RadarMeteoPanel";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

export function MeteoPage() {
  const [filtro, setFiltro] = useState<ProvinciaSlug | "tutte">("tutte");
  const provincia = filtro !== "tutte" ? PROVINCE[filtro] : null;

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Meteo</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Bollettino, temperatura live, vento e pioggia — fonte: OSMER ARPA FVG, Protezione Civile FVG
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFiltro("tutte")}
            className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              filtro === "tutte" ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            Tutta la regione
          </button>
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setFiltro(p.slug)}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                filtro === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        {filtro === "tutte" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
            <Panel title="Meteo · Le 4 province" linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it">
              <MeteoOverview />
            </Panel>

            <Panel
              title="Radar meteo"
              linkLabel="Protezione Civile FVG →"
              linkHref="https://monitor.protezionecivile.fvg.it"
            >
              <RadarMeteoPanel />
            </Panel>
          </div>
        ) : (
          provincia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
              <Panel title="Bollettino" linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it">
                <MeteoDettaglio provincia={filtro as ProvinciaSlug} />
              </Panel>

              <Panel title={`Condizioni live — ${provincia.nome}`}>
                <TemperaturaBadge provincia={filtro as ProvinciaSlug} size="lg" />
                <div className="mt-3">
                  <MeteoWidgetSlot slug={filtro as ProvinciaSlug} cittaNome={provincia.nome} />
                </div>
              </Panel>

              <Panel
                title="Vento"
                linkLabel="Protezione Civile FVG →"
                linkHref="https://monitor.protezionecivile.fvg.it"
              >
                <VentoPanel provincia={filtro as ProvinciaSlug} />
              </Panel>

              <Panel
                title="Pioggia"
                linkLabel="Protezione Civile FVG →"
                linkHref="https://monitor.protezionecivile.fvg.it"
              >
                <PioggiaPanel provincia={filtro as ProvinciaSlug} />
              </Panel>
            </div>
          )
        )}
      </main>
    </>
  );
}
