import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";

// Componente generico "in arrivo" (11/09/2026) — generalizza
// SanitaInArrivoPage.tsx (che aveva il breadcrumb "← Sanità" fisso nel
// codice) per poter essere riusato anche fuori da Sanità, es. la
// Galleria fotografica sotto "FVG in immagini". Stesso messaggio,
// breadcrumb e link "indietro" ora passati come prop.
export function InArrivoPage({
  titolo,
  backHref,
  backLabel,
}: {
  titolo: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href={backHref} className="text-cool-ink text-xs font-mono hover:underline">
          ← {backLabel}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{titolo}</h1>

        <div className="grid grid-cols-1 gap-px bg-line border border-line mt-4">
          <Panel title={titolo}>
            <p className="text-ink-faint text-sm font-mono">
              Sezione in arrivo in una prossima fase, non appena saranno disponibili dati verificati.
            </p>
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
