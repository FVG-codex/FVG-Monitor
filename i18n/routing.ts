import { defineRouting } from "next-intl/routing";

// Configurazione centrale dell'internazionalizzazione (i18n), fase 1
// (03/10/2026). Scope confermato con l'utente via AskUserQuestion:
// - si traduce solo l'interfaccia (header, menu, footer, guscio
//   homepage), non i dati provenienti da fonti esterne (notizie,
//   eventi, bollettini restano in italiano anche nelle altre lingue);
// - si parte dall'inglese; tedesco/sloveno/croato seguiranno uno alla
//   volta (vedi nota 29/09/2026 in lib/changelog.ts e nel doc di
//   progetto);
// - gli URL italiani restano SENZA prefisso (es. /maree), le altre
//   lingue hanno il prefisso (es. /en/maree) — `localePrefix:
//   "as-needed"` fa esattamente questo: nessun prefisso per la
//   defaultLocale, prefisso per tutte le altre. Forma verificata
//   direttamente sui types installati di next-intl 4.14.9
//   (node_modules/next-intl/dist/types/routing/types.d.ts): il tipo
//   `LocalePrefix` accetta sia la stringa breve "as-needed" sia la
//   forma verbosa {mode:"as-needed"} — qui usiamo la stringa breve.
export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
