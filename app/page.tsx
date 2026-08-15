import { AlertBanner } from "@/components/AlertBanner";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { ZoneChip } from "@/components/ZoneChip";

// Dati segnaposto: in Fase 1 questi arriveranno da Supabase
// (tabella `snapshots`, una riga per modulo) invece che da costanti locali.
const METEO = { temp: 27, cond: "Sereno, foschia in dissolvimento", citta: "Trieste", zona: "C" as const };
const ALLERTA_ATTIVA = {
  livello: "gialla" as const,
  messaggio: "Vento forte da Bora su zona costiera FVG-C — validità fino alle 20:00",
};

export default function Home() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <div className="max-w-[1180px] mx-auto px-5">
        {ALLERTA_ATTIVA && (
          <AlertBanner livello={ALLERTA_ATTIVA.livello} messaggio={ALLERTA_ATTIVA.messaggio} />
        )}
      </div>

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
          <Panel title="Meteo" linkLabel="OSMER ARPA FVG →" linkHref="#" span={2}>
            <div className="flex items-end gap-4">
              <div className="font-cond font-bold text-[64px] leading-[0.8]">
                {METEO.temp}
                <sup className="text-[0.35em] font-medium text-ink-dim">°C</sup>
              </div>
              <div className="font-serif italic text-ink-dim pb-2">{METEO.cond}</div>
              <div className="ml-auto text-right pb-2">
                <div className="font-cond font-semibold text-sm uppercase tracking-wide flex items-center gap-1.5 justify-end">
                  {METEO.citta} <ZoneChip zone={METEO.zona} />
                </div>
              </div>
            </div>
            <p className="text-ink-faint text-xs font-mono mt-4">
              placeholder — la fascia oraria e le statistiche (umidità, pressione, UV) arrivano
              in Fase 1
            </p>
          </Panel>

          <Panel title="Allerte · Zone" linkLabel="Storico →" linkHref="#">
            <div className="flex gap-1.5">
              {(["A", "B", "C", "D"] as const).map((z) => (
                <div key={z} className="flex-1 border border-line rounded p-2 text-center">
                  <ZoneChip zone={z} size="md" />
                  <div className="font-mono text-[9px] uppercase text-ink-faint mt-1.5">
                    {z === "C" ? "Gialla" : "Verde"}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Notizie locali" linkLabel="Tutte →" linkHref="#">
            <p className="text-ink-faint text-sm font-mono">
              placeholder — elenco titoli da RSS in Fase 1
            </p>
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
        <span>FVG Monitor — Fase 0</span>
        <span>Scaffold di progetto, dati reali in arrivo dalla Fase 1</span>
      </footer>
    </>
  );
}
