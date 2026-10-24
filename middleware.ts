import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// `createMiddleware` verificato su
// node_modules/next-intl/dist/types/middleware/middleware.d.ts:
// default export, riceve direttamente la routing config e restituisce
// la funzione middleware per Next.js.
const intlMiddleware = createMiddleware(routing);

// VARIANTE "SENZA PASSWORD" (24/10/2026) — su richiesta dell'utente,
// due build parallele per poter togliere/rimettere il cancello
// d'ingresso senza dover rigenerare il pacchetto. Qui il controllo
// del cookie (lib/auth.ts, /login, LogoutButton) è stato tolto di
// mezzo: il middleware fa solo l'instradamento multilingua di
// next-intl, come prima dell'introduzione del login (19/10/2026). Le
// pagine app/[locale]/login/ e le route app/api/login|logout/
// restano nel codice (innocue, semplicemente non più raggiunte da
// nessun redirect) così da poter tornare alla build "con password"
// senza differenze di codice sorgente, solo di questo file e di
// components/Footer.tsx (pulsante "Esci" tolto).
export default async function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  // Matcher standard Next.js (non specifico di next-intl): esclude le
  // API route (/api/..., che non devono avere prefisso di lingua — la
  // GitHub Action di ingestione e i fetch client-side le chiamano con
  // percorso fisso), gli asset interni di Next (/_next/...) e qualsiasi
  // file con estensione (favicon, immagini, ecc.).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
