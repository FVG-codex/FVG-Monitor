import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, getCredentials, signToken } from "@/lib/auth";

// POST /api/login — verifica utente/password e, se corretti, imposta il
// cookie di sessione firmato (vedi lib/auth.ts). Chiamata da
// components/LoginPage.tsx via fetch(), non da un <form> con submit
// nativo, per poter mostrare l'errore senza ricaricare la pagina.
export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { user, password } = getCredentials();
  const usernameOk = typeof body.username === "string" && body.username === user;
  const passwordOk = typeof body.password === "string" && body.password === password;

  if (!usernameOk || !passwordOk) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await signToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return res;
}
