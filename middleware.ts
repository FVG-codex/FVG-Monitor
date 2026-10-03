import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// `createMiddleware` verificato su
// node_modules/next-intl/dist/types/middleware/middleware.d.ts:
// default export, riceve direttamente la routing config e restituisce
// la funzione middleware per Next.js.
export default createMiddleware(routing);

export const config = {
  // Matcher standard Next.js (non specifico di next-intl): esclude le
  // API route (/api/..., che non devono avere prefisso di lingua — la
  // GitHub Action di ingestione e i fetch client-side le chiamano con
  // percorso fisso), gli asset interni di Next (/_next/...) e qualsiasi
  // file con estensione (favicon, immagini, ecc.).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
