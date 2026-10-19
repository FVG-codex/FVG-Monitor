"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

// Pagina di ingresso con password (19/10/2026) — vedi lib/auth.ts e
// middleware.ts per come funziona il cancello. Volutamente SENZA
// TopHeader/Footer (non deve esporre la navigazione del sito prima del
// login): una card centrata minimale con lo stesso stile visivo del resto
// del sito. Usa next/navigation (non @/i18n/navigation) perché legge
// `next` dalla query string della route grezza — il redirect dopo login
// deve tornare esattamente al percorso con prefisso di lingua richiesto
// in origine, non venire ri-elaborato dal router locale-aware.
export function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  function destinazioneSicura(): string {
    const next = searchParams.get("next");
    // solo percorsi relativi interni: niente "//evil.com" o "https://...",
    // per evitare un open redirect tramite il parametro `next`.
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return "/";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(false);
    setInCorso(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setErrore(true);
        setInCorso(false);
        return;
      }
      router.push(destinazioneSicura());
      router.refresh();
    } catch {
      setErrore(true);
      setInCorso(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-1.5 justify-center mb-6">
          <span className="w-2 h-2 rounded-full bg-cool" />
          <span className="font-cond font-bold text-xl uppercase tracking-wide">FVG Monitor</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded p-6 flex flex-col gap-4">
          <div>
            <h1 className="font-cond font-bold text-lg uppercase tracking-wide mb-1">{t("titolo")}</h1>
            <p className="text-ink-faint text-xs font-mono">{t("sottotitolo")}</p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-ink-faint text-xs font-mono">{t("utenteLabel")}</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="px-3 py-1.5 rounded text-sm bg-panel-alt border border-line text-ink focus:outline-none focus:border-cool"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ink-faint text-xs font-mono">{t("passwordLabel")}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-3 py-1.5 rounded text-sm bg-panel-alt border border-line text-ink focus:outline-none focus:border-cool"
            />
          </label>

          {errore && <p className="text-amber-700 dark:text-amber-400 text-xs font-mono">{t("erroreCredenziali")}</p>}

          <button
            type="submit"
            disabled={inCorso}
            className="mt-1 px-4 py-2 rounded text-sm font-cond font-semibold uppercase tracking-wide bg-cool text-on-accent hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {inCorso ? t("bottoneInCorso") : t("bottone")}
          </button>
        </form>
      </div>
    </div>
  );
}
