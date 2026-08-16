import { AlertBanner } from "@/components/AlertBanner";
import { AllertaWidgetSlot } from "@/components/AllertaWidgetSlot";
import { MeteoOverview } from "@/components/MeteoPanel";
import { NotiziePanel } from "@/components/NotiziePanel";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { ZoneChip } from "@/components/ZoneChip";

// Il banner allerta resta manuale finché non ingeriamo lo stato zone
// dal Widget PC (vedi AllertaWidgetSlot) — per ora placeholder di
// esempio, da rimuovere/collegare quando il widget è integrato.
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

          <Panel title="Allerte · Zone" linkLabel="Storico →" linkHref="#">
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
            <AllertaWidgetSlot />
          </Panel>

          <Panel title="Notizie locali" linkLabel="Tutte →" linkHref="https://www.ansa.it/friuliveneziagiulia/">
            <NotiziePanel />
          </Panel>

          <Panel title="Viabilità" linkLabel="InfoViaggiando →" linkHref="#">
            <p className="text-ink-faint text-sm font-mono">placeholder — Fase 2</p>
          </Panel>

          <Panel title="Trasporto pubblico" linkLabel="TPL FVG →" linkHref="#">
            <p className="text-ink-faint text-sm font-mono">placeholder — Fase 2</p>
          </Panel>
        </div>
      </main>

      <footer className="max-w-[1180px] mx-auto px-5 py-6 border-t border-line font-mono text-[11px] text-ink-faint flex justify-between flex-wrap gap-2">
        <span>FVG Monitor — Fase 1</span>
        <span>Fonti: OSMER ARPA FVG · ANSA FVG · Protezione Civile FVG</span>
      </footer>
    </>
  );
}
