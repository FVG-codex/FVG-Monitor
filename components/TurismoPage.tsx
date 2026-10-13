import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";

// Hub "Turismo" (11/09/2026, richiesto dall'utente) — stesso pattern di
// app/sport/page.tsx e components/SanitaPage.tsx. Raggruppa sezioni che
// prima erano voci a sé nel menù ad amburger: Strutture ricettive (dal
// 26/08/2026) e Piste ciclabili (dal 27/08/2026). Entrambe restano
// invariate nel contenuto — solo aggiunto un breadcrumb "← Turismo" in
// cima a ciascuna, stesso pattern già in uso per "← Sanità" su
// /farmacie. Neve & Impianti (16/09/2026) è la terza sezione, vedi
// components/NeveImpiantiPage.tsx e lib/neveImpianti.ts. Eventi
// (17/09/2026) è la quarta, pagina dedicata con tab Oggi/Domani/Weekend/
// Prossimi — vedi components/EventiPage.tsx e lib/eventi.ts.
const SEZIONI = [
  {
    key: "neveImpianti",
    href: "/neve-impianti",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 6v36M24 6l-6 6M24 6l6 6M24 42l-6-6M24 42l6-6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 15l32 18M8 33l32-18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "struttureRicettive",
    href: "/strutture-ricettive",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 40V16l18-10 18 10v24" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 40h36M18 40V26h12v14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "pisteCiclabili",
    href: "/piste-ciclabili",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="34" r="7" />
        <circle cx="36" cy="34" r="7" />
        <path d="M12 34l8-18h8l8 18M20 16h8M28 34h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "eventi",
    href: "/eventi",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="7" y="10" width="34" height="31" rx="2" />
        <path d="M7 19h34M15 6v8M33 6v8" strokeLinecap="round" />
        <path d="M15 26h6M27 26h6M15 33h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // Parchi e giardini (12/10/2026, dataset regionale "efx9-g469" su
    // dati.friuliveneziagiulia.it) — spostata qui da Ambiente il
    // 12/10/2026 su indicazione dell'utente (appartiene a Turismo, non
    // ad Ambiente). Vedi lib/parchigiardini.ts e
    // components/ParchiGiardiniPage.tsx. Pattern live (come Farmacie):
    // il dataset ha coordinate, quindi c'è anche una mappa.
    key: "parchiGiardini",
    href: "/parchi-giardini",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 6c6 6 10 12 10 18a10 10 0 0 1-20 0c0-6 4-12 10-18z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 30v12M18 42h12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // Musei (13/10/2026, richiesto dall'utente: "una pagina... nome del
    // museo, descrizione, orari, sito web e link ai biglietti"). Dataset
    // STATICO raccolto una tantum dal catalogo ERPAC
    // (patrimonioculturale.regione.fvg.it) — vedi lib/musei.ts per la
    // nota estesa su fonte/raccolta/limiti (orari e biglietti assenti
    // nella fonte per ogni voce, mai inventati). Nessuna mappa (la fonte
    // non ha coordinate per le schede-museo), stesso schema tab
    // provincia/comune + ricerca di SitiInquinatiPage.tsx. Vedi
    // components/MuseiPage.tsx.
    key: "musei",
    href: "/musei",
    icona: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 18l18-12 18 12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 18h32v4H8zM11 22v18M19 22v18M29 22v18M37 22v18" strokeLinecap="round" />
        <path d="M6 40h36" strokeLinecap="round" />
      </svg>
    ),
  },
];

export async function TurismoPage() {
  const t = await getTranslations("turismo");
  const tNav = await getTranslations("nav");
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("turismo")}</h1>
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
