import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Stesso pattern hub di app/sport/page.tsx: card statiche con icona SVG,
// nessun fetch dati qui (i conteggi live sono sulla pagina di ciascun
// tipo). Icone in stile lineare coerente con quelle già in uso (viewBox
// 48x48, stroke currentColor, strokeWidth 1.5).
const TIPI = [
  {
    nome: "Bed & Breakfast",
    href: "/bed-and-breakfast",
    descrizione: "Camere in case private certificate dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 40V16M6 28h36v12M18 28v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="13" cy="20" r="2.5" />
        <path d="M42 28v12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Affittacamere",
    href: "/affittacamere",
    descrizione: "Camere in affitto certificate dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="10" y="8" width="28" height="34" rx="1.5" />
        <path d="M28 25a2 2 0 1 0 0.01 0" fill="currentColor" stroke="none" />
        <path d="M18 8v34M10 16h8M10 24h8M10 32h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Campeggi e Villaggi Turistici",
    href: "/campeggi",
    descrizione: "Campeggi e villaggi certificati dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 8L8 40h32L24 8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 8v32M17 40l7-16 7 16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Alloggi Agrituristici",
    href: "/agriturismi",
    descrizione: "Agriturismi certificati dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 22L24 8l16 14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 20v20h24V20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 40V28h8v12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 8v6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Alberghi Diffusi",
    href: "/alberghi-diffusi",
    descrizione: "Ospitalità diffusa nei borghi, certificata dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 40h10V26L9 22 4 26v14zM14 40V18l8-6 8 6v22M18 40V30h8v10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 40h14V24l-7-6-7 6v16z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Strutture Ricettive a carattere Sociale",
    href: "/strutture-sociali",
    descrizione: "Ostelli, foresterie e simili, certificati dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="16" cy="14" r="5" />
        <circle cx="32" cy="14" r="5" />
        <path d="M4 38c0-7 5-12 12-12s12 5 12 12M20 38c0-7 5-12 12-12s12 5 12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Dry Marina e Marina Resort",
    href: "/marina",
    descrizione: "Rimessaggio e marina resort certificati dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 6v30M18 12h12" strokeLinecap="round" />
        <circle cx="24" cy="10" r="2.5" />
        <path d="M24 36c-8 0-14-6-14-6s2 12 14 12 14-12 14-12-6 6-14 6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Rifugi Alpini Escursionistici",
    href: "/rifugi",
    descrizione: "Rifugi in montagna certificati dai Comuni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 38L16 14l6 10 4-6 18 20z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 38l6-10 4 6 4-4 6 8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function StruttureRicettiveHubPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Strutture ricettive</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Registri regionali delle strutture ricettive del Friuli Venezia Giulia, certificate dai Comuni e dalla
          Direzione centrale attività produttive — fonte: Regione Autonoma FVG (dati.friuliveneziagiulia.it)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {TIPI.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="border border-line rounded p-5 bg-panel hover:border-cool transition-colors flex flex-col gap-3"
            >
              <span className="text-cool">{t.icona}</span>
              <div>
                <div className="font-cond font-bold text-lg uppercase tracking-wide">{t.nome}</div>
                <div className="text-ink-faint text-xs mt-1">{t.descrizione}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
