"use client";

import { MeteoDettaglio } from "@/components/MeteoPanel";
import { MeteoWidgetSlot } from "@/components/MeteoWidgetSlot";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { PROVINCE, type ProvinciaSlug } from "@/lib/province";

export function ProvinciaPage({ slug }: { slug: ProvinciaSlug }) {
  const provincia = PROVINCE[slug];

  return (
    <>
      <TopHeader paginaAttiva={slug} />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
          <Panel title="Meteo" linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it">
            <MeteoDettaglio provincia={slug} />
          </Panel>

          <Panel title={`Condizioni live — ${provincia.nome}`}>
            <MeteoWidgetSlot slug={slug} cittaNome={provincia.nome} />
          </Panel>
        </div>

        <p className="text-ink-faint text-xs font-mono mt-6">
          Altri moduli specifici per {provincia.nome} (allerte, viabilità, notizie locali)
          arrivano nelle fasi successive del piano.
        </p>
      </main>
    </>
  );
}
