import { getTranslations } from "next-intl/server";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { ContattiForm } from "@/components/ContattiForm";

// Pagina "Contatti" (/contatti, 24/11/2026) — terzo e ultimo sotto-punto
// del backlog "Contatti" (il primo, l'elenco dei 215 Comuni, vive sotto
// Servizi da sessioni precedenti; il secondo, i numeri di emergenza,
// resta ancora da fare). Diversamente da quello: qui non è un registro
// di dati esterni, è la pagina del progetto stesso per segnalazioni/
// feedback/correzioni — da cui la scelta di metterla solo nel footer
// (vedi Footer.tsx, accanto al Registro modifiche) invece che nel menu
// hamburger degli hub dati (MenuHamburger.tsx).
//
// Stesso schema di ChangelogPage.tsx (altra pagina "di sito", non un
// hub dati): TopHeader/Footer completi — a differenza di LoginPage.tsx,
// qui non c'è motivo di nascondere la navigazione.
export async function ContattiPage() {
  const t = await getTranslations("contattiPage");
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-6 max-w-lg">{t("descrizione")}</p>

        <ContattiForm />
      </main>

      <Footer />
    </>
  );
}
