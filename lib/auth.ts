// Cancello d'ingresso con password (19/10/2026) — richiesto dall'utente:
// "ho bisogno di proteggerlo da password... costruire una pagina iniziale e
// creare un nome utente e password per proteggerla", ora che il sito
// comincia a essere visibile. Un solo utente/password condiviso (non un
// sistema multi-utente con account distinti): pensato per tenere il sito
// fuori da occhi indiscreti durante questa fase, non per proteggere dati
// sensibili — le route /api/* restano raggiungibili direttamente da chi ne
// conosce l'URL esatto (vedi nota in middleware.ts), così come già oggi per
// es. /api/treni/... usate dai pannelli lato client.
//
// Il cookie contiene un TOKEN FISSO firmato con HMAC-SHA256(secret,
// costante) — non un vero JWT con scadenza propria incorporata: con un solo
// "utente" condiviso non serve distinguere sessioni diverse, la scadenza la
// fa il Max-Age del cookie (30 giorni, rinnovato ad ogni login). Si usa
// `crypto.subtle` (Web Crypto) invece di `node:crypto` perché questo file
// gira sia in app/api/login/route.ts (runtime Node.js) sia in
// middleware.ts (Edge runtime di Next.js) — `crypto.subtle` è l'unica API
// di firma disponibile in entrambi (Node la espone come globale dalla
// v19, verificato su Node 22 in questa sandbox).
//
// Credenziali e secret di firma: leggibili da variabili d'ambiente
// (SITE_AUTH_USER / SITE_AUTH_PASSWORD / SITE_AUTH_SECRET, vedi
// .env.example) con un fallback fisso alle credenziali indicate
// dall'utente in chat, così il sito consegnato funziona subito anche senza
// configurare nulla su Vercel. **Da impostare su Vercel (Settings →
// Environment Variables) prima di un uso reale**: il fallback resta nel
// codice sorgente, chiunque legga questo file lo vede.

export const AUTH_COOKIE = "fvg_auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

const TOKEN_PAYLOAD = "fvg-monitor-auth-v1";

function getSecret(): string {
  return process.env.SITE_AUTH_SECRET || "fvg-monitor-dev-secret-cambiami-su-vercel";
}

export function getCredentials(): { user: string; password: string } {
  return {
    user: process.env.SITE_AUTH_USER || "admin",
    password: process.env.SITE_AUTH_PASSWORD || "M0n1t0rFVG",
  };
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(TOKEN_PAYLOAD));
  return toBase64Url(signature);
}

export async function isValidToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await signToken();
  if (token.length !== expected.length) return false;
  // confronto a tempo costante sulla lunghezza del token: con un solo
  // segreto condiviso (non per-utente) non serve una vera libreria
  // timing-safe, ma evitiamo comunque lo short-circuit di === su stringhe.
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
