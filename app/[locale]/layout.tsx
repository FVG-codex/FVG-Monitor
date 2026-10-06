import type { Metadata } from "next";
import Script from "next/script";
import { Barlow_Condensed, Newsreader, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Google Analytics (05/09/2026): id fornito dall'utente, GA4.
// `next/script` con strategy="afterInteractive" è il pattern raccomandato
// da Next.js per gtag.js — carica dopo che la pagina è diventata
// interattiva (non blocca il rendering iniziale come un <script> semplice
// nel <head>), ma comunque presto abbastanza da tracciare la navigazione
// da subito. Meglio di incollare i due <script> forniti così come sono:
// quelli userebbero un normale tag HTML, che Next.js sconsiglia
// esplicitamente per script di terze parti in favore di questo componente.
const GA_MEASUREMENT_ID = "G-BJT393WSQT";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

// Fase 1 — Multilingua (03/10/2026): la cartella app/ è diventata
// app/[locale]/ per ospitare il routing di next-intl (vedi
// i18n/routing.ts, middleware.ts). Il contenuto effettivo di QUESTO
// layout non cambia rispetto a prima a parte: lang dinamico invece di
// "it" fisso, e il wrapper NextIntlClientProvider che rende disponibili
// le traduzioni (messages/it.json, messages/en.json) ai componenti
// client (TopHeader, Footer, MenuHamburger, ecc. — vedi quei file per
// l'uso di useTranslations()).
//
// Fix reale #1 (03/10/2026, log di build Vercel reale incollato
// dall'utente): la prima versione aveva anche `generateStaticParams()`
// per pre-generare /it e /en come pagine statiche al momento della
// build — next-intl lo consiglia quando l'app è renderizzabile
// staticamente. Ma qui ogni pagina del sito legge dati live da Supabase
// ad ogni richiesta (meteo, allerte, viabilità, ecc.): non è mai stata
// un'app a rendering statico, nemmeno prima di questa modifica. In
// `next build` su Vercel questo ha fatto fallire il prerendering di
// TUTTE le pagine (errore generico, solo un digest esadecimale senza
// messaggio — tipico di un errore inghiottito durante il prerendering
// statico di React in produzione) — mai riprodotto da questa sessione
// in `next dev`, che renderizza sempre dinamicamente e quindi non
// esercita questo percorso. Rimosso `generateStaticParams`.
//
// Fix reale #2 (03/10/2026, stesso giorno, secondo log di build Vercel
// incollato dall'utente, commit successivo): rimuovere
// `generateStaticParams` non bastava — restava un numero minore ma
// ancora consistente di pagine che falliva con lo stesso errore a
// digest durante "Generating static pages". Causa: senza
// `generateStaticParams`, Next.js NON rende automaticamente dinamico
// ogni percorso sotto [locale] — decide staticità pagina per pagina in
// base a cosa quella pagina usa (funzioni dinamiche come cookies()/
// headers(), opzioni di fetch, ecc.), quindi tentava comunque di
// pre-renderizzare in build quelle pagine che non davano a Next nessun
// segnale esplicito di dinamicità. Verificato leggendo direttamente il
// codice sorgente installato di Next.js
// (node_modules/next/dist/build/utils.js, funzioni
// collectGenerateParams/isPageStatic): la configurazione di route
// segment `dynamic` dichiarata in un layout viene raccolta per PRIMA
// nell'attraversamento dell'albero (dal layout radice verso le pagine
// figlie) e poi "congelata" — la riduzione imposta il valore alla prima
// occorrenza trovata e non lo sovrascrive più, quindi `dynamic =
// "force-dynamic"` messo qui nel layout si applica a OGNI pagina sotto
// [locale], senza eccezioni e senza doverlo ripetere in ciascun
// page.tsx. Stesso meccanismo già usato in app/api/*/route.ts in questo
// progetto (vedi ad es. app/api/treni/[tipo]/[stazione]/route.ts), solo
// applicato qui al livello del layout invece che per singola route.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const DESCRIZIONI: Record<string, string> = {
    en: "Weather, alerts, traffic, transport and news for Friuli Venezia Giulia in a single page.",
    de: "Wetter, Warnungen, Verkehr, Transport und Nachrichten für Friuli Venezia Giulia auf einer einzigen Seite.",
    sl: "Vreme, opozorila, prometne razmere, javni prevoz in novice za Friuli Venezia Giulia na eni strani.",
    hr: "Vrijeme, upozorenja, promet, prijevoz i vijesti iz Friuli Venezia Giulia na jednom mjestu.",
  };
  return {
    title: "FVG Monitor",
    description:
      DESCRIZIONI[locale] ??
      "Meteo, allerte, viabilità, trasporti e notizie del Friuli Venezia Giulia in un'unica pagina.",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Guardia standard next-intl: se il segmento [locale] non è una
  // lingua supportata (es. richiesta diretta a /fr non gestita dal
  // middleware per qualche motivo), 404 invece di renderizzare con un
  // locale inventato.
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // setRequestLocale (API server-side di next-intl, non chiamata nei
  // Client Component): abilita la generazione statica delle pagine
  // sotto [locale] fissando la lingua della richiesta corrente prima
  // che i Server Component a valle (e getMessages qui sotto) la
  // leggano.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    // suppressHydrationWarning: lo script inline subito sotto può
    // impostare data-theme="light" sull'<html> prima che React idrati —
    // senza questa prop React segnalerebbe un mismatch tra l'HTML
    // renderizzato dal server (sempre senza data-theme) e quello che
    // trova nel browser. Riguarda solo questo attributo, non l'intero
    // albero (vedi nota tema chiaro/scuro, 04/09/2026).
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${barlowCondensed.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-serif`}
      >
        <NextIntlClientProvider messages={messages}>
          {/* Tema chiaro/scuro (04/09/2026): script bloccante, deve essere il
              PRIMO elemento del <body> ed eseguire in modo sincrono (niente
              async/defer) — il browser lo esegue durante il parsing
              dell'HTML, prima di dipingere il resto della pagina, quindi
              imposta data-theme sull'<html> prima che l'utente veda un
              frame col tema sbagliato. Legge solo la preferenza salvata da
              ThemeToggle.tsx (nessuna preferenza di sistema/prefers-color-
              scheme: il tema chiaro è un'opzione esplicita "su richiesta
              dell'utente", non un default automatico — il sito resta scuro
              finché non lo si cambia a mano). */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var t=localStorage.getItem('fvgmonitor-tema');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();",
            }}
          />
          {/* Skip link (Fase 4 — Accessibilità, 24/08/2026): invisibile finché
              non riceve il focus da tastiera, permette di saltare header +
              menu + banner allerte e andare dritti al contenuto — ogni pagina
              del sito ripete la stessa intestazione, quindi senza questo un
              utente da tastiera dovrebbe attraversarla ad ogni pagina.
              Punta all'id "contenuto-principale" presente su ogni <main>. */}
          <SkipLink />
          {children}
          {/* Google Analytics (05/09/2026) — vedi nota sopra */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Piccolo componente server a parte solo per usare getTranslations in
// modo pulito senza duplicare la chiamata async nel corpo principale
// di RootLayout (che è già async per via di `params`/setRequestLocale).
async function SkipLink() {
  const t = await getTranslations("chrome");
  return (
    <a
      href="#contenuto-principale"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-cool focus:text-on-accent focus:px-3 focus:py-2 focus:rounded focus:font-cond focus:font-semibold"
    >
      {t("skipLink")}
    </a>
  );
}
