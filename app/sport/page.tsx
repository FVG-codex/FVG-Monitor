import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";

const SPORT = [
  {
    nome: "Calcio",
    href: "/calcio",
    descrizione: "9 campionati regionali LND — Eccellenza, Promozione, Prima e Seconda Categoria",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="18" />
        <path
          d="M24 12l7 5-2.5 8h-9L17 17l7-5zM24 30v6M14 20l-6 3M34 20l6 3M17 38l3-6M31 38l-3-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    nome: "Basket",
    href: "/basket",
    descrizione: "Serie C / Divisione Regionale 1 — squadre FVG",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="18" />
        <path d="M24 6v36M6 24h36M10.5 12.5c6 5 6 19 0 24M37.5 12.5c-6 5-6 19 0 24" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Baseball & Softball",
    href: "/baseball",
    descrizione: "Serie A Silver, Serie B Baseball, Serie A2 Softball — squadre FVG",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="15" />
        <path d="M12 15c4 3 4 15 0 18M36 15c-4 3-4 15 0 18" strokeLinecap="round" />
        <path d="M32 8l8 8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function SportHubPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Sport</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Campionati dilettantistici e regionali del Friuli Venezia Giulia
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {SPORT.map((s) => (
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
    </>
  );
}
