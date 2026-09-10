import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { EconomiaDisoccupazionePanel } from "@/components/EconomiaDisoccupazionePanel";

// Sezione "Economia" — prima consegna 10/09/2026. Nasce da una
// ricognizione richiesta dall'utente sulla categoria "Economia e
// Finanze" del portale open data regionale (esclusa: quasi solo bilanci
// comunali) e un approfondimento su ISTAT/Unioncamere/Camere di
// Commercio: solo l'API SDMX di ISTAT ha prodotto un dato utilizzabile
// e verificato con dati reali (vedi commento su ingestEconomiaDisoccupazione()
// in scripts/ingest-light.mjs).
//
// Un solo indicatore per ora (disoccupazione trimestrale FVG) — a
// differenza delle altre sezioni indipendenti del sito (Aviazione, Piste
// ciclabili...), qui i dati cambiano solo 4 volte l'anno: pagina
// volutamente minimale, pensata per crescere con altri indicatori
// (es. prezzi al consumo, PIL) quando/se verranno verificati allo stesso
// modo.
export function EconomiaPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Economia</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Indicatori economici del Friuli Venezia Giulia — fonte: ISTAT (Istituto Nazionale di Statistica), dati
          trimestrali
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
          <Panel
            title="Disoccupazione"
            linkLabel="ISTAT — Esplora dati →"
            linkHref="https://esploradati.istat.it/"
          >
            <EconomiaDisoccupazionePanel />
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
