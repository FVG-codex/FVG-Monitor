import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE, isValidToken } from "./lib/auth";

// `createMiddleware` verificato su
// node_modules/next-intl/dist/types/middleware/middleware.d.ts:
// default export, riceve direttamente la routing config e restituisce
// la funzione middleware per Next.js.
const intlMiddleware = createMiddleware(routing);

// Cancello d'ingresso con password (19/10/2026) — richiesto dall'utente,
// vedi lib/auth.ts per come viene firmato/verificato il cookie e
// components/LoginPage.tsx per il modulo. Il controllo gira PRIMA del
// middleware di next-intl: se manca un cookie valido, redirect a
// /login (con `next` per tornare dove si era diretti) senza nemmeno
// interpellare la logica di instradamento lingua. "/login" stesso (con o
// senza prefisso di lingua) bypassa il controllo per evitare un loop di
// redirect, e passa comunque per next-intl così resta raggiungibile
// correttamente su /en/login, /de/login, ecc.
//
// **Cosa NON copre**: il matcher sotto esclude "/api/..." (stesso motivo
// già documentato qui: le route API non hanno prefisso di lingua) — quelle
// restano raggiungibili senza login da chi ne conosce l'URL esatto, come
// già oggi per es. /api/treni/... chiamate lato client dai pannelli. Per
// un sito "in anteprima" questo è accettabile (nessun dato scritto da lì,
// solo proxy verso fonti già pubbliche); se in futuro servisse un cancello
// anche lì, va aggiunto un controllo esplicito dentro ogni route.
const LOCALE_PREFIX_RE = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

function isLoginPath(pathname: string): boolean {
  const senzaLingua = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
  return senzaLingua === "/login" || senzaLingua === "/login/";
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isLoginPath(pathname)) {
    return intlMiddleware(req);
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const autenticato = await isValidToken(token);

  if (!autenticato) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

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
