import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// `getRequestConfig` verificato su
// node_modules/next-intl/dist/types/server/react-server/getRequestConfig.d.ts
// — riceve `{ requestLocale }` (una Promise, non un valore diretto:
// corrisponde al segmento [locale] intercettato dal middleware).
//
// Nota: la versione installata (next-intl 4.14.9) NON esporta una
// funzione `hasLocale` nella sua API pubblica (verificato: l'unica
// occorrenza di "hasLocale" nei file .d.ts del package è interna a
// extractor/utils.d.ts, non è un export del pacchetto principale né di
// next-intl/server o next-intl/routing). Alcuni esempi in rete usano
// `hasLocale` perché si riferiscono a una versione più recente non
// installata qui: la validazione del locale si fa quindi a mano con
// `routing.locales.includes(...)`, senza inventare un import che non
// esiste in questa versione.
export default getRequestConfig(async ({ requestLocale }) => {
  const richiesto = await requestLocale;
  const locale =
    richiesto && (routing.locales as readonly string[]).includes(richiesto)
      ? richiesto
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
