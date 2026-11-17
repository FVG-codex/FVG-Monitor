import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { PROVINCE_LIST } from "@/lib/province";

// SEO/metadata per-pagina (17/11/2026) — nato dalla verifica di un
// cross-check esterno (ChatGPT) confermata riga per riga sul codice
// reale prima di intervenire (vedi claude/fvgmonitor-stato.md, sessione
// del 17/11/2026): il sito aveva un solo <title> fisso ("FVG Monitor")
// su ogni pagina/lingua, nessun canonical/hreflang/Open Graph, nessun
// sitemap.ts/robots.ts. Scope confermato con l'utente via
// AskUserQuestion: titoli riusando le traduzioni già esistenti (zero
// testo nuovo), descrizione generica ovunque per ora (stessa della
// homepage), un'immagine Open Graph generica per tutto il sito.
//
// Questo file è la fonte unica di verità per tutto quello che serve a
// costruire il <title>/canonical/hreflang/OG di ogni pagina — importato
// sia da ogni `generateMetadata()` di `app/[locale]/*/page.tsx`, sia da
// `app/sitemap.ts`/`app/robots.ts`, sia (per i soli titoli di sezione)
// da `components/TopHeader.tsx`, che li usava già per il sottotitolo in
// pagina — spostati qui invece di duplicarli, così il <title> e il
// sottotitolo visibile in pagina non possono mai disallinearsi.

export const SITE_URL = "https://monitor.fvg.it";
export const SITE_NAME = "FVG Monitor";

// Codice locale Open Graph per `og:locale` — formato xx_YY richiesto
// dalla specifica OG, non il semplice codice a 2 lettere di next-intl.
export const OG_LOCALE: Record<(typeof routing.locales)[number], string> = {
  it: "it_IT",
  en: "en_US",
  de: "de_DE",
  sl: "sl_SI",
  hr: "hr_HR",
};

// Stessa descrizione generica già scritta per la homepage (prima qui
// sotto duplicata in app/[locale]/layout.tsx, ora spostata qui e
// riusata da entrambi): finché non si scrivono descrizioni su misura
// pagina per pagina (punto lasciato aperto nel backlog), ogni pagina
// priva di una propria descrizione usa questa come fallback — meglio
// di una descrizione vuota o duplicata dal <title>.
export const DESCRIZIONE_GENERICA: Record<string, string> = {
  it: "Meteo, allerte, viabilità, trasporti e notizie del Friuli Venezia Giulia in un'unica pagina.",
  en: "Weather, alerts, traffic, transport and news for Friuli Venezia Giulia in a single page.",
  de: "Wetter, Warnungen, Verkehr, Transport und Nachrichten für Friuli Venezia Giulia auf einer einzigen Seite.",
  sl: "Vreme, opozorila, prometne razmere, javni prevoz in novice za Friuli Venezia Giulia na eni strani.",
  hr: "Vrijeme, upozorenja, promet, prijevoz i vijesti iz Friuli Venezia Giulia na jednom mjestu.",
};

// Spostate qui da components/TopHeader.tsx (che le riusa da qui, vedi
// lì): una voce per ogni pagina di primo livello del sito — struttura
// piatta perché il sito non ha un albero di route annidato sotto
// app/[locale]/ (vedi nota originale in TopHeader.tsx). Aggiunta "/blsd"
// (17/11/2026): mancava anche nella tabella originale — stesso fix la
// corregge sia qui (titolo di pagina) sia in TopHeader (sottotitolo in
// pagina, che finora restava senza sottotitolo su questa pagina).
export const TITOLO_SEZIONE_CHIAVE: Record<string, string> = {
  // Hub principali (stessa chiave "nav.*" usata dall'hamburger — vedi
  // MenuHamburger.tsx)
  "/meteo": "nav.meteo",
  "/notizie": "nav.notizie",
  "/ambiente": "nav.ambiente",
  "/sport": "nav.sport",
  "/fvg-in-immagini": "nav.immagini",
  "/viabilita": "nav.viabilita",
  "/trasporti": "nav.trasporti",
  "/aviazione": "nav.aviazione",
  "/sanita": "nav.sanita",
  "/turismo": "nav.turismo",
  "/economia": "nav.economia",
  "/commercio": "nav.commercio",
  // Sanità
  "/dentisti": "sanita.sezioni.dentisti.nome",
  "/veterinari": "sanita.sezioni.veterinari.nome",
  "/pronto-soccorso": "sanita.sezioni.prontoSoccorso.nome",
  "/farmacie": "sanita.sezioni.farmacie.nome",
  "/farmacie-di-turno": "farmacie.titoloTurno",
  "/farmacie-tutte": "farmacie.titoloTutte",
  "/cliniche": "sanita.sezioni.cliniche.nome",
  "/guardie-mediche": "sanita.sezioni.guardieMediche.nome",
  "/blsd": "blsd.titolo",
  // Turismo
  "/eventi": "turismo.sezioni.eventi.nome",
  "/neve-impianti": "turismo.sezioni.neveImpianti.nome",
  "/piste-ciclabili": "turismo.sezioni.pisteCiclabili.nome",
  "/strutture-ricettive": "turismo.sezioni.struttureRicettive.nome",
  "/parchi-giardini": "turismo.sezioni.parchiGiardini.nome",
  "/musei": "turismo.sezioni.musei.nome",
  "/osmize": "turismo.sezioni.osmize.nome",
  "/agriturismi": "struttureRicettive.tipi.agriturismi.nome",
  "/affittacamere": "struttureRicettive.tipi.affittacamere.nome",
  "/alberghi-diffusi": "struttureRicettive.tipi.alberghi-diffusi.nome",
  "/bed-and-breakfast": "struttureRicettive.tipi.bb.nome",
  "/campeggi": "struttureRicettive.tipi.campeggi.nome",
  "/marina": "struttureRicettive.tipi.marina.nome",
  "/rifugi": "struttureRicettive.tipi.rifugi.nome",
  "/strutture-sociali": "struttureRicettive.tipi.sociali.nome",
  // Ambiente
  "/dati-ambientali": "datiAmbientali.titolo",
  "/terremoti": "ambiente.sezioni.terremoti.nome",
  "/maree": "ambiente.sezioni.maree.nome",
  "/siti-inquinati": "ambiente.sezioni.sitiInquinati.nome",
  // Servizi
  "/servizi": "servizi.titolo",
  "/rifiuti": "servizi.sezioni.rifiuti.nome",
  "/comuni": "servizi.sezioni.comuni.nome",
  // FVG in immagini
  "/webcam": "fvgInImmagini.sezioni.webcam.nome",
  "/galleria": "inArrivoPages.galleria",
  // Commercio
  "/supermercati": "commercio.categorie.supermercati.nome",
  "/colonnine-elettriche": "viabilita.colonnineElettriche",
  // Altro
  "/changelog": "changelogPage.titolo",
  "/contatti": "contattiPage.titolo",
};

// Spostata da TopHeader.tsx (vedi lì per il motivo: le 5 pagine Sport
// non hanno ancora una chiave di traduzione breve, solo testo fisso in
// italiano).
export const TITOLO_SEZIONE_FISSO: Record<string, string> = {
  "/calcio": "Calcio",
  "/basket": "Basket",
  "/baseball": "Baseball & Softball",
  "/tennis": "Tennis",
  "/sci": "Sci",
};

// Tutte le route di primo livello del sito, home esclusa — stessa lista
// usata da app/sitemap.ts. Mantenuta qui a mano (non derivata dal
// filesystem: next build non consente di leggere l'albero di app/ a
// runtime in un Edge/Node generico senza un passo di build a parte) —
// verificata contro `find app/[locale] -name page.tsx` al momento della
// stesura (60 route totali, home compresa). "/login" esclusa di
// proposito: non deve essere indicizzata (vedi app/robots.ts).
export const ROUTE_PATHS: string[] = [
  "/affittacamere", "/agriturismi", "/alberghi-diffusi", "/ambiente", "/aviazione",
  "/baseball", "/basket", "/bed-and-breakfast", "/blsd", "/calcio", "/campeggi",
  "/changelog", "/cliniche", "/colonnine-elettriche", "/commercio", "/comuni",
  "/contatti", "/dati-ambientali", "/dentisti", "/economia", "/eventi", "/farmacie",
  "/farmacie-di-turno", "/farmacie-tutte", "/fvg-in-immagini", "/galleria", "/gorizia",
  "/guardie-mediche", "/maree", "/marina", "/meteo", "/musei", "/neve-impianti",
  "/notizie", "/osmize", "/parchi-giardini", "/piste-ciclabili", "/pordenone",
  "/pronto-soccorso", "/rifiuti", "/rifugi", "/sanita", "/sci", "/servizi",
  "/siti-inquinati", "/sport", "/strutture-ricettive", "/strutture-sociali",
  "/supermercati", "/tennis", "/terremoti", "/trasporti", "/trieste", "/turismo",
  "/udine", "/veterinari", "/viabilita", "/webcam",
];

/**
 * URL assoluto di `pathname` per `locale`, rispettando
 * `localePrefix: "as-needed"` di i18n/routing.ts: l'italiano (lingua di
 * default) non ha prefisso, le altre 4 lingue sì (es. "/en/rifiuti").
 */
export function urlAssoluto(pathname: string, locale: string): string {
  const prefisso = locale === routing.defaultLocale ? "" : `/${locale}`;
  const percorso = pathname === "/" ? prefisso || "/" : `${prefisso}${pathname}`;
  return `${SITE_URL}${percorso}`;
}

/**
 * Canonical + hreflang per `pathname`: un link "languages" per ognuna
 * delle 5 lingue più "x-default" (punta alla lingua di default, italiano
 * — convenzione standard per una pagina senza una vera versione
 * "internazionale" neutra).
 */
export function alternateLingue(pathname: string) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = urlAssoluto(pathname, locale);
  }
  languages["x-default"] = urlAssoluto(pathname, routing.defaultLocale);
  return languages;
}

/**
 * Titolo di sezione per `pathname`, tradotto per `locale` — stessa
 * identica risoluzione già usata in TopHeader.tsx (province → poi
 * TITOLO_SEZIONE_FISSO → poi TITOLO_SEZIONE_CHIAVE), qui come funzione
 * a sé invece che in un hook React, per poter girare lato server dentro
 * `generateMetadata()`. Ritorna `null` per la home (nessun suffisso di
 * sezione) o per una pagina non mappata (nessun'altra attualmente, dopo
 * l'aggiunta di "/blsd" sopra).
 */
async function titoloSezione(pathname: string, locale: string): Promise<string | null> {
  if (pathname === "/") return null;
  const provincia = PROVINCE_LIST.find((p) => `/${p.slug}` === pathname);
  if (provincia) return provincia.nome;
  if (pathname in TITOLO_SEZIONE_FISSO) return TITOLO_SEZIONE_FISSO[pathname];
  const chiave = TITOLO_SEZIONE_CHIAVE[pathname];
  if (!chiave) return null;
  try {
    const t = await getTranslations({ locale });
    const valore = t(chiave as Parameters<typeof t>[0]);
    return typeof valore === "string" ? valore : null;
  } catch {
    return null;
  }
}

/**
 * Metadata completa di una pagina: titolo (sezione + nome sito, o solo
 * nome sito per la home), descrizione (generica per ora, vedi
 * DESCRIZIONE_GENERICA sopra), canonical + hreflang, Open Graph e
 * Twitter card. Da chiamare da `generateMetadata()` in ogni
 * `app/[locale]/<pagina>/page.tsx` — vedi uno qualunque per l'uso
 * (sempre le stesse 4 righe, cambia solo `pathname`).
 *
 * Non imposta `manifest`/`icons`/`appleWebApp`/`metadataBase`: restano
 * ereditati da `app/[locale]/layout.tsx` (Next.js unisce i campi non
 * specificati qui con quelli del layout genitore — non serve ripeterli
 * ad ogni pagina).
 */
export async function metadataPagina({
  pathname,
  locale,
}: {
  pathname: string;
  locale: string;
}): Promise<Metadata> {
  const sezione = await titoloSezione(pathname, locale);
  const title = sezione ? `${sezione} · ${SITE_NAME}` : SITE_NAME;
  const description = DESCRIZIONE_GENERICA[locale] ?? DESCRIZIONE_GENERICA[routing.defaultLocale];
  const url = urlAssoluto(pathname, locale);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: alternateLingue(pathname),
    },
    // Niente `openGraph.images`/`twitter.images` qui: Next.js li
    // ricava da solo da app/[locale]/opengraph-image.tsx (convenzione
    // di file) e li aggancia a questa stessa metadata — tentare di
    // sovrascriverli a mano con un URL costruito da `urlAssoluto()`
    // (per evitare il redirect 307 che next-intl applica di suo
    // all'URL con prefisso "/it/..." sulla lingua di default, unico
    // caso toccato) non ha avuto effetto: verificato con una richiesta
    // reale in sandbox, Next.js continua a usare l'URL che trova da
    // solo. Nessun problema funzionale (i bot social seguono il
    // redirect), solo un hop in più evitabile non raggiunto — lasciato
    // così invece di tenere nel codice un tentativo di correzione che
    // non fa nulla.
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale as keyof typeof OG_LOCALE] ?? OG_LOCALE[routing.defaultLocale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
