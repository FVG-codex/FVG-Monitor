import { AlertBanner } from "@/components/AlertBanner";
import { AriaPanel } from "@/components/AriaPanel";
import { EventiPanel } from "@/components/EventiPanel";
import { FiumeOverview } from "@/components/FiumeOverview";
import { MeteoOverview } from "@/components/MeteoPanel";
import { NotiziePanel } from "@/components/NotiziePanel";
import { OzonoPanel } from "@/components/OzonoPanel";
import { Panel } from "@/components/Panel";
import { MarePanel } from "@/components/MarePanel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { TgrCard } from "@/components/TgrCard";
import { TopHeader } from "@/components/TopHeader";
import { VentoPanel } from "@/components/VentoPanel";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { VoliPanel } from "@/components/VoliPanel";
import { ZoneChip } from "@/components/ZoneChip";
import { PROVINCE_LIST } from "@/lib/province";

// Il banner allerta resta manuale finché non ingeriamo lo stato zone
// dal Widget PC — per ora placeholder di esempio, da rimuovere/
// collegare quando il widget è integrato in tutte e 4 le pagine
// provincia (vedi ProvinciaPage.tsx).
const ALLERTA_ATTIVA = {
  livello: "gialla" as const,
  messaggio: "Vento forte da Bora su zona costiera FVG-C — validità fino alle 20:00",
};

export default function Home() {
  return (
    <>
      <TopHeader paginaAttiva="regione" />
      <div className="isobar" />

      <div className="max-w-[1180px] mx-auto px-5">
        {ALLERTA_ATTIVA && (
          <AlertBanner livello={ALLERTA_ATTIVA.livello} messaggio={ALLERTA_ATTIVA.messaggio} />
        )}
      </div>

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
          <Panel title="Meteo · Le 4 province" linkLabel="OSMER ARPA FVG →" linkHref="https://www.meteo.fvg.it" span={2}>
            <MeteoOverview />
          </Panel>

          <Panel title="Allerte · Zone" linkLabel="Storico →" linkHref="https://www.protezionecivile.fvg.it/it/allerte-tutte">
            <div className="flex gap-1.5 mb-4">
              {(["A", "B", "C", "D"] as const).map((z) => (
                <div key={z} className="flex-1 border border-line rounded p-2 text-center">
                  <ZoneChip zone={z} size="md" />
                  <div className="font-mono text-[9px] uppercase text-ink-faint mt-1.5">
                    {z === "C" ? "Gialla" : "Verde"}
                  </div>
                </div>
              ))}
            </div>
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

          <Panel title="Qualità dell'aria · PM10" linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it">
            <AriaPanel />
          </Panel>

          <Panel title="Qualità dell'aria · Ozono" linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it">
            <OzonoPanel />
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
