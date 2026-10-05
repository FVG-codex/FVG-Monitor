import { getTranslations } from "next-intl/server";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";

// Componente generico "in arrivo" (11/09/2026) — generalizza
// SanitaInArrivoPage.tsx (che aveva il breadcrumb "← Sanità" fisso nel
// codice) per poter essere riusato anche fuori da Sanità, es. la
// Galleria fotografica sotto "FVG in immagini". Stesso messaggio,
// breadcrumb e link "indietro" ora passati come prop.
//
// Multilingua — testo fisso (05/10/2026): titolo/backLabel restano prop
// (tradotti dalla pagina chiamante con i18n/routing già tradotto, es.
// nav.sanita/nav.immagini), ma il messaggio fisso è identico su tutte
// le pagine "in arrivo" quindi tradotto qui direttamente via
// `getTranslations` — componente async (Server Component), nessun
// bisogno di "use client" perché non ha stato né interattività.
export async function InArrivoPage({
  titolo,
  backHref,
  backLabel,
}: {
  titolo: string;
  backHref: string;
  backLabel: string;
}) {
  const t = await getTranslations("inArrivo");
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href={backHref} className="text-cool-ink text-xs font-mono hover:underline">
          ← {backLabel}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{titolo}</h1>

        <div className="grid grid-cols-1 gap-px bg-line border border-line mt-4">
          <Panel title={titolo}>
            <p className="text-ink-faint text-sm font-mono">{t("messaggio")}</p>
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
