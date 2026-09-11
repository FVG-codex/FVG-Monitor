import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";

// Placeholder per le sezioni di Sanità non ancora popolate (11/09/2026:
// Cliniche & centri medici, Dentisti & Odontoiatri) — struttura del
// menù già pronta (vedi components/SanitaPage.tsx), dati da aggiungere
// in una sessione futura quando l'utente fornirà un elenco, stesso
// flusso già seguito per Veterinari (vedi lib/veterinari.ts).
export function SanitaInArrivoPage({ titolo }: { titolo: string }) {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/sanita" className="text-cool-ink text-xs font-mono hover:underline">
          ← Sanità
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
