import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Ambiente → Servizi (17/09/2026, richiesto dall'utente: "Nuova sezione
// 'servizi' all'interno della sezione ambiente"), stesso pattern hub di
// TurismoPage.tsx/AmbientePage.tsx. Parte con una sola voce (Rifiuti —
// vedi RifiutiPage.tsx/lib/rifiuti.ts), pensata per accoglierne altre in
// futuro (altri servizi comunali/utility) senza dover riorganizzare di
// nuovo il menù.
const SEZIONI = [
  {
    nome: "Raccolta differenziata",
    href: "/rifiuti",
    descrizione: "Calendario porta a porta, centro di raccolta e campane del vetro per 28 comuni (Isontino/Carso)",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 12h20l-2 28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2L14 12z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12h28M19 12V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 19v14M28 19v14" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function ServiziPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/ambiente" className="text-cool-ink text-xs font-mono hover:underline">
          ← Ambiente
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">Servizi</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Servizi comunali e di pubblica utilità in Friuli Venezia Giulia
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
