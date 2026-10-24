import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Footer condiviso da tutte le pagine del sito (stesso pattern di
// TopHeader: importato e reso da ogni pagina, non da app/layout.tsx —
// così ogni pagina resta libera di aggiungere una riga extra, es. le
// fonti in homepage, tramite `extra`).
//
// Contiene il link al registro modifiche (/changelog, vedi
// lib/changelog.ts) — richiesto dall'utente il 25/08/2026 per avere
// una cronologia sempre aggiornata di cosa cambia sul sito.
//
// Fase 1 — Multilingua (03/10/2026): "FVG Monitor" resta invariato
// (nome proprio del sito, non si traduce) mentre il link al registro
// modifiche usa useTranslations + il Link locale-aware di next-intl
// (@/i18n/navigation) così resta sotto /en/changelog quando si naviga
// in inglese invece di tornare all'italiano.
export function Footer({ extra }: { extra?: ReactNode }) {
  const t = useTranslations("footer");
  return (
    <footer className="max-w-[1180px] mx-auto px-5 py-6 border-t border-line font-mono text-[11px] text-ink-faint flex justify-between flex-wrap gap-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span>FVG Monitor</span>
        <Link href="/changelog" className="hover:text-cool-ink transition-colors">
          {t("changelog")}
        </Link>
      </div>
      {extra}
    </footer>
  );
}
