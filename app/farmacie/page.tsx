import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Stesso pattern hub di app/sport/page.tsx e app/strutture-ricettive/page.tsx
// (26/08/2026, richiesto dall'utente): card statiche, nessun fetch dati
// qui — le due pagine figlie leggono la stessa snapshot Supabase
// "farmacie" filtrandola in modo diverso, vedi lib/farmacie.ts.
const SEZIONI = [
  {
    nome: "Tutte le farmacie",
    href: "/farmacie-tutte",
    descrizione: "Elenco completo con orari di oggi e contatti",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="8" width="32" height="32" rx="3" />
        <path d="M24 16v16M16 24h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Farmacie di turno",
    href: "/farmacie-di-turno",
    descrizione: "Solo le farmacie con apertura straordinaria oggi",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="17" />
        <path d="M24 14v10l7 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function FarmacieHubPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Farmacie</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Farmacie del Friuli Venezia Giulia — fonte: Regione Autonoma FVG (dati.friuliveneziagiulia.it)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SEZIONI.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="border border-line rounded p-5 bg-panel hover:border-cool transition-colors flex flex-col gap-3"
            >
              <span className="text-cool">{s.icona}</span>
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
