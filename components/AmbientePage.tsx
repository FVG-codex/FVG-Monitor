import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Ambiente" (11/09/2026, richiesto dall'utente) — stesso pattern
// di app/sport/page.tsx e components/SanitaPage.tsx. Raggruppa "Dati
// ambientali" (nuovo, gli stessi dati già in homepage ma suddivisi per
// provincia — vedi DatiAmbientaliPage.tsx) e "Terremoti" (esistente dal
// lancio, prima voce a sé nel menù ad amburger — solo aggiunto un
// breadcrumb "← Ambiente" in cima a quella pagina). "Servizi"
// (17/09/2026) è un sotto-hub a sua volta (vedi ServiziPage.tsx), parte
// con la Raccolta differenziata (RifiutiPage.tsx/lib/rifiuti.ts). "Maree"
// (02/10/2026) è una pagina dedicata (decisione utente), non un pannello
// in homepage — vedi MareePage.tsx.
const SEZIONI = [
  {
    key: "datiAmbientali",
    href: "/dati-ambientali",
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
    key: "terremoti",
    href: "/terremoti",
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
  {
    // Maree (02/10/2026, richiesto dall'utente il 13/09/2026) — vedi
    // MareePage.tsx e i commenti in scripts/ingest-light.mjs (sezione
    // "MAREE") per fonti dati e dettagli.
    key: "maree",
    href: "/maree",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M4 20c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 30c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "servizi",
    href: "/servizi",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 12h20l-2 28a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2L14 12z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12h28M19 12V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 19v14M28 19v14" strokeLinecap="round" />
      </svg>
    ),
  },
];

export async function AmbientePage() {
  const t = await getTranslations("ambiente");
  const tNav = await getTranslations("nav");
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("ambiente")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("descrizione")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SEZIONI.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="border border-line rounded p-5 bg-panel hover:border-cool transition-colors flex flex-col gap-3"
            >
              <span className="text-cool-ink">{s.icona}</span>
              <div>
                <div className="font-cond font-bold text-lg uppercase tracking-wide">
                  {t(`sezioni.${s.key}.nome`)}
                </div>
                <div className="text-ink-faint text-xs mt-1">{t(`sezioni.${s.key}.descrizione`)}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
