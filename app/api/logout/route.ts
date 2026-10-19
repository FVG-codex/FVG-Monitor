import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// POST /api/logout — cancella il cookie di sessione. Chiamata dal pulsante
// "Esci" nel footer (components/LogoutButton.tsx).
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
