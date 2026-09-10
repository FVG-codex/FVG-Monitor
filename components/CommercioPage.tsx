import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Commercio" (10/09/2026) — stesso pattern di app/sport/page.tsx:
// una card per categoria, pensato per crescere. Solo "Supermercati" per
// ora (dato fornito dall'utente, vedi lib/supermercati.ts); altre
// attività commerciali verranno aggiunte in futuro come nuove card qui.
const CATEGORIE = [
  {
    nome: "Supermercati",
    href: "/supermercati",
    descrizione: "Supermercati, ipermercati e discount delle 4 province — indirizzi, orari e mappa",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M8 12h4l3 20h22l3-14H15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="38" r="2.5" />
        <circle cx="33" cy="38" r="2.5" />
      </svg>
    ),
  },
];

export function CommercioPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Commercio</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Attività commerciali del Friuli Venezia Giulia
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIE.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="border border-line rounded p-5 bg-panel hover:border-cool transition-colors flex flex-col gap-3"
            >
              <span className="text-cool-ink">{c.icona}</span>
              <div>
                <div className="font-cond font-bold text-lg uppercase tracking-wide">{c.nome}</div>
                <div className="text-ink-faint text-xs mt-1">{c.descrizione}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
