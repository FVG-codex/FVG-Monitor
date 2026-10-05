"use client";

import { useTranslations } from "next-intl";
import { AutobusPanel } from "@/components/AutobusPanel";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { TreniPanel } from "@/components/TreniPanel";
import { VoliPanel } from "@/components/VoliPanel";

export function TrasportiPage() {
  const t = useTranslations("trasporti");
  const tNav = useTranslations("nav");
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("trasporti")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("descrizione")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mb-8">
          <Panel
            title="Trieste Airport"
            linkLabel={t("voliLink")}
            linkHref="https://triesteairport.it/it/airport/voli-e-destinazioni/voli-in-tempo-reale/"
            span={3}
          >
            <VoliPanel />
          </Panel>

          <Panel title={t("treni")} linkLabel="ViaggiaTreno →" linkHref="https://www.viaggiatreno.it/" span={3}>
            <TreniPanel />
          </Panel>

          <Panel title={t("autobus")} linkLabel="TPL FVG →" linkHref="https://tplfvg.it/it/orari/mappa/" span={3}>
            <AutobusPanel />
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
