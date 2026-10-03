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
// "it" fisso, generateStaticParams per pre-generare /it (invisibile,
// senza prefisso) e /en, e il wrapper NextIntlClientProvider che rende
// disponibili le traduzioni (messages/it.json, messages/en.json) ai
// componenti client (TopHeader, Footer, MenuHamburger, ecc. — vedi
// quei file per l'uso di useTranslations()).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: "FVG Monitor",
    description:
      locale === "en"
        ? "Weather, alerts, traffic, transport and news for Friuli Venezia Giulia in a single page."
        : "Meteo, allerte, viabilità, trasporti e notizie del Friuli Venezia Giulia in un'unica pagina.",
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
