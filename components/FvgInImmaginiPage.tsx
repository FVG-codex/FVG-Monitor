import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "FVG in immagini" (11/09/2026, richiesto dall'utente) — stesso
// pattern di app/sport/page.tsx e components/SanitaPage.tsx. Raggruppa
// Webcam regionali (esistente dal lancio, prima voce a sé nel menù ad
// amburger — solo aggiunto un breadcrumb "← FVG in immagini" in cima
// a quella pagina) e una nuova Galleria fotografica, per ora
// placeholder ("in arrivo"): l'utente ha detto "Inseriremo un database
// fotografico più avanti" — la struttura di navigazione è pronta prima
// del dato reale, stesso principio già seguito per Cliniche/Dentisti
// in Sanità.
const SEZIONI = [
  {
    nome: "Webcam regionali",
    href: "/webcam",
    descrizione: "Immagini dalle webcam OSMER ARPA FVG, per provincia",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="14" width="36" height="24" rx="3" />
        <circle cx="24" cy="26" r="7" />
        <path d="M17 14l3-5h8l3 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    nome: "Galleria fotografica",
    href: "/galleria",
    descrizione: "In arrivo",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="8" width="36" height="32" rx="3" />
        <circle cx="16" cy="18" r="3.5" />
        <path d="M6 32l10-10 8 8 6-6 12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function FvgInImmaginiPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">FVG in immagini</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Webcam regionali e, in arrivo, una galleria fotografica del Friuli Venezia Giulia
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
