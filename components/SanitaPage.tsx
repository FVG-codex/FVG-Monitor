import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Sanità" (11/09/2026) — stesso pattern di app/sport/page.tsx e
// components/CommercioPage.tsx: una card per sezione. Farmacie esisteva
// già come voce di menù a sé (dal 26/08/2026); da questa sessione è
// raggiungibile da qui invece che direttamente dal menù ad amburger
// (vedi MenuHamburger.tsx, voce "Farmacie" sostituita da "Sanità").
// Cliniche & centri medici e Dentisti & Odontoiatri sono nuove voci
// strutturali senza dati ancora (componenti/route placeholder, vedi
// components/SanitaInArrivoPage.tsx) — solo Veterinari & Emergenze ha
// dati reali in questa consegna (provincia di Trieste, vedi
// lib/veterinari.ts).
const SEZIONI = [
  {
    nome: "Farmacie",
    href: "/farmacie",
    descrizione: "Tutte le farmacie e le farmacie di turno, per provincia e comune",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="8" width="32" height="32" rx="3" />
        <path d="M24 16v16M16 24h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Cliniche & centri medici",
    href: "/cliniche",
    descrizione: "In arrivo",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 8v14M17 15h14" strokeLinecap="round" />
        <rect x="8" y="22" width="32" height="18" rx="3" />
      </svg>
    ),
  },
  {
    nome: "Veterinari & Emergenze",
    href: "/veterinari",
    descrizione: "Cliniche e ambulatori veterinari, con le eventuali emergenze in evidenza",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M24 40c-9-6-16-12-16-20a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 8-7 14-16 20z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M24 17v10M19 22h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    nome: "Dentisti & Odontoiatri",
    href: "/dentisti",
    descrizione: "In arrivo",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M24 10c-5 0-9 3-9 9 0 6 2 8 2 13 0 4 2 6 4 6s3-3 3-8 0-6 0-6 0 1 0 6 1 8 3 8 4-2 4-6c0-5 2-7 2-13 0-6-4-9-9-9z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function SanitaPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Sanità</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Farmacie, cliniche, veterinari e dentisti del Friuli Venezia Giulia
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
