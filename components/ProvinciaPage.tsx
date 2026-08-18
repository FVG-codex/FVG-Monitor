"use client";

import { AllertaWidgetSlot } from "@/components/AllertaWidgetSlot";
import { FiumePanel } from "@/components/FiumePanel";
import { MeteoDettaglio } from "@/components/MeteoPanel";
import { MeteoWidgetSlot } from "@/components/MeteoWidgetSlot";
import { Panel } from "@/components/Panel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { TemperaturaBadge } from "@/components/TemperaturaBadge";
import { TopHeader } from "@/components/TopHeader";
import { VentoPanel } from "@/components/VentoPanel";
import { ZoneChip } from "@/components/ZoneChip";
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
            <TemperaturaBadge provincia={slug} size="lg" />
            <div className="mt-3">
              <MeteoWidgetSlot slug={slug} cittaNome={provincia.nome} />
            </div>
          </Panel>

          <Panel
            title="Vento"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <VentoPanel provincia={slug} />
          </Panel>

          <Panel
            title="Pioggia"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <PioggiaPanel provincia={slug} />
          </Panel>

          <Panel
            title="Livello fiume"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <FiumePanel provincia={slug} />
          </Panel>

          <Panel
            title="Allerta Protezione Civile"
            linkLabel="Storico →"
            linkHref="https://www.protezionecivile.fvg.it/it/allerte-tutte"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-ink-dim">Zona di allertamento:</span>
              <ZoneChip zone={provincia.zona} size="md" />
            </div>
            <AllertaWidgetSlot slug={slug} cittaNome={provincia.nome} />
          </Panel>
        </div>

        <p className="text-ink-faint text-xs font-mono mt-6">
          Altri moduli specifici per {provincia.nome} (viabilità, notizie locali) arrivano
          nelle fasi successive del piano.
        </p>
      </main>
    </>
  );
}
