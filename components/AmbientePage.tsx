import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Ambiente" (11/09/2026, richiesto dall'utente) — stesso pattern
// di app/sport/page.tsx e components/SanitaPage.tsx. Raggruppa "Dati
// ambientali" (nuovo, gli stessi dati già in homepage ma suddivisi per
// provincia — vedi DatiAmbientaliPage.tsx) e "Terremoti" (esistente dal
// lancio, prima voce a sé nel menù ad amburger — solo aggiunto un
// breadcrumb "← Ambiente" in cima a quella pagina).
const SEZIONI = [
  {
    nome: "Dati ambientali",
    href: "/dati-ambientali",
    descrizione: "Vento, pioggia, aria, pollini, mare, fiumi e balneazione, per provincia",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M24 6c6 8 12 16 12 24a12 12 0 0 1-24 0c0-8 6-16 12-24z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    nome: "Terremoti",
    href: "/terremoti",
    descrizione: "Eventi sismici in FVG e zone limitrofe, ultimi 30 giorni",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M6 30l7-8 5 6 4-10 6 8 4-4 10 8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 38h36" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AmbientePage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Ambiente</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Dati ambientali per provincia e terremoti in Friuli Venezia Giulia
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
