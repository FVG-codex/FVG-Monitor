import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Turismo" (11/09/2026, richiesto dall'utente) — stesso pattern di
// app/sport/page.tsx e components/SanitaPage.tsx. Raggruppa due sezioni
// che prima erano voci a sé nel menù ad amburger: Strutture ricettive
// (dal 26/08/2026) e Piste ciclabili (dal 27/08/2026). Entrambe restano
// invariate nel contenuto — solo aggiunto un breadcrumb "← Turismo" in
// cima a ciascuna, stesso pattern già in uso per "← Sanità" su
// /farmacie.
const SEZIONI = [
  {
    nome: "Strutture ricettive",
    href: "/strutture-ricettive",
    descrizione: "Hotel, B&B, agriturismi e altre strutture ricettive per tipologia",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 40V16l18-10 18 10v24" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 40h36M18 40V26h12v14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Piste ciclabili",
    href: "/piste-ciclabili",
    descrizione: "Percorsi ciclabili regionali, anelli, ciclovie a tappe e mountain bike",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="34" r="7" />
        <circle cx="36" cy="34" r="7" />
        <path d="M12 34l8-18h8l8 18M20 16h8M28 34h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function TurismoPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Turismo</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Strutture ricettive e percorsi ciclabili del Friuli Venezia Giulia
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SEZIONI.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="border border-line rounded p-5 bg-panel hover:border-cool transition-colors flex flex-col gap-3"
            >
              <span className="text-cool-ink">{s.icona}</span>
              <div>
                <div className="font-cond font-bold text-lg uppercase tracking-wide">{s.nome}</div>
                <div className="text-ink-faint text-xs mt-1">{s.descrizione}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
