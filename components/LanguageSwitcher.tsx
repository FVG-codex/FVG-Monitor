"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Selettore di lingua (Fase 1 — Multilingua, 03/10/2026). Usa il
// `Link` di next-intl con la prop `locale` esplicita (verificata su
// node_modules/next-intl/dist/types/navigation/react-client/createNavigation.d.ts
// — il tipo delle props di Link include `locale?: Locale`): passando
// un locale diverso da quello corrente, next-intl genera da solo
// l'URL con/senza prefisso secondo `localePrefix: "as-needed"` (vedi
// i18n/routing.ts) — restando sulla stessa pagina (`usePathname()` di
// next-intl restituisce il percorso SENZA il prefisso di lingua, cosa
// verificata leggendo lo stesso file di tipi).
//
// Etichette ("IT"/"EN") non tradotte di proposito: sono il nome della
// lingua di destinazione, non testo dell'interfaccia nella lingua
// corrente.
const LINGUE: { locale: (typeof routing.locales)[number]; etichetta: string }[] = [
  { locale: "it", etichetta: "IT" },
  { locale: "en", etichetta: "EN" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("chrome");

  return (
    <nav aria-label={t("languageSwitcher")} className="flex items-center gap-1 font-mono text-xs">
      {LINGUE.map((l) => (
        <Link
          key={l.locale}
          href={pathname}
          locale={l.locale}
          aria-current={l.locale === locale ? "true" : undefined}
          className={`px-1.5 py-1 rounded border transition-colors ${
            l.locale === locale
              ? "bg-cool border-cool text-on-accent"
              : "border-line text-ink-dim hover:text-ink hover:border-ink-faint"
          }`}
        >
          {l.etichetta}
        </Link>
      ))}
    </nav>
  );
}
