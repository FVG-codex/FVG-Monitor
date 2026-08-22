import { AlertBannerLive } from "@/components/AlertBannerLive";
import { AllertaZonePanel } from "@/components/AllertaZonePanel";
import { AriaQualitaPanel } from "@/components/AriaQualitaPanel";
import { EventiPanel } from "@/components/EventiPanel";
import { FiumeOverview } from "@/components/FiumeOverview";
import { MeteoOverview } from "@/components/MeteoPanel";
import { NotiziePanel } from "@/components/NotiziePanel";
import { Panel } from "@/components/Panel";
import { MarePanel } from "@/components/MarePanel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { PolliniPanel } from "@/components/PolliniPanel";
import { TgrCard } from "@/components/TgrCard";
import { TopHeader } from "@/components/TopHeader";
import { VentoPanel } from "@/components/VentoPanel";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { VoliPanel } from "@/components/VoliPanel";
import { PROVINCE_LIST } from "@/lib/province";

export default function Home() {
  return (
    <>
      <TopHeader paginaAttiva="regione" />
      <div className="isobar" />

      <div className="max-w-[1180px] mx-auto px-5">
        <AlertBannerLive />
      </div>

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
          <Panel title="Meteo · Le 4 province" linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it" span={2}>
            <MeteoOverview />
          </Panel>

          <Panel title="Allerte · Zone" linkLabel="Storico →" linkHref="https://www.protezionecivile.fvg.it/it/allerte-tutte">
            <AllertaZonePanel />
            <p className="text-ink-faint text-xs font-mono mb-2">
              Dettaglio e widget ufficiale per provincia:
            </p>
            <div className="flex flex-wrap gap-2">
              {PROVINCE_LIST.map((p) => (
                <a
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="text-xs font-mono text-cool hover:underline"
                >
                  {p.nome} →
                </a>
              ))}
            </div>
          </Panel>

          <Panel title="Notizie locali" linkLabel="Tutte →" linkHref="https://www.ansa.it/friuliveneziagiulia/">
            <NotiziePanel />
          </Panel>

          <Panel
            title="Bora · Vento"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <VentoPanel />
          </Panel>

          <Panel
            title="Pioggia"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <PioggiaPanel />
          </Panel>

          <Panel title="Viabilità" linkLabel="InfoViaggiando →" linkHref="https://infoviaggiando.it">
            <ViabilitaPanel />
          </Panel>

          <Panel title="Qualità dell'aria" linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it">
            <AriaQualitaPanel />
          </Panel>

          <Panel title="Pollini" linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it/temi/temi/pollini/">
            <PolliniPanel />
          </Panel>

          <Panel
            title="Livelli fiumi"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <FiumeOverview />
          </Panel>

          <Panel
            title="Livello mare"
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <MarePanel />
          </Panel>

          <Panel
            title="Trieste Airport"
            linkLabel="Tutti i voli →"
            linkHref="https://triesteairport.it/it/airport/voli-e-destinazioni/voli-in-tempo-reale/"
            span={2}
          >
            <VoliPanel />
          </Panel>

          <Panel title="TGR FVG">
            <TgrCard />
          </Panel>

          <Panel title="Eventi in regione" linkLabel="Tutti →" linkHref="https://www.turismofvg.it/eventi" span={2}>
            <EventiPanel />
          </Panel>
        </div>
      </main>

      <footer className="max-w-[1180px] mx-auto px-5 py-6 border-t border-line font-mono text-[11px] text-ink-faint flex justify-between flex-wrap gap-2">
        <span>FVG Monitor — Fase 3</span>
        <span>Fonti: OSMER ARPA FVG · ANSA FVG · Protezione Civile FVG (CC BY 4.0) · InfoViaggiando · Turismo FVG · RAI TGR FVG · Trieste Airport</span>
      </footer>
    </>
  );
}
