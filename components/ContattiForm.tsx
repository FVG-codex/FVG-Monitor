"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

// Modulo di contatto (24/11/2026) — stesso schema di invio via fetch()
// già usato da LoginPage.tsx, stesse classi di stile per input/label/
// bottone (nessuno stile nuovo introdotto). Tre stati di esito dopo
// l'invio: "successo", "errore" (generico, vedi sotto) o niente ancora.
export function ContattiForm() {
  const t = useTranslations("contattiPage");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");
  // Campo honeypot: resta vuoto per chi lo compila come essere umano
  // (è invisibile e non raggiungibile da tastiera, vedi tabIndex/aria
  // sotto), si riempie solo se un bot invia tutti i campi del form alla
  // cieca — vedi app/api/contatti/route.ts per cosa succede in quel caso.
  const [azienda, setAzienda] = useState("");
  const [stato, setStato] = useState<"idle" | "inCorso" | "successo" | "errore">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStato("inCorso");
    try {
      const res = await fetch("/api/contatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, messaggio, _azienda: azienda }),
      });
      if (!res.ok) {
        setStato("errore");
        return;
      }
      setStato("successo");
      setNome("");
      setEmail("");
      setMessaggio("");
    } catch {
      setStato("errore");
    }
  }

  if (stato === "successo") {
    return (
      <div className="bg-panel border border-line rounded p-6">
        <p className="font-cond font-semibold text-base uppercase tracking-wide mb-1.5">
          {t("successoTitolo")}
        </p>
        <p className="text-ink-dim text-sm">{t("successoTesto")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-panel border border-line rounded p-6 flex flex-col gap-4 max-w-lg"
    >
      {/* Honeypot: fuori dallo schermo invece di `display:none`/`hidden`
          (alcuni bot semplici ignorano i campi nascosti con quei due
          metodi ma non questo), non raggiungibile da tastiera e
          nascosto anche a chi usa uno screen reader. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Non compilare questo campo
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={azienda}
            onChange={(e) => setAzienda(e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-ink-faint text-xs font-mono">{t("nomeLabel")}</span>
        <input
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={200}
          className="px-3 py-1.5 rounded text-sm bg-panel-alt border border-line text-ink focus:outline-none focus:border-cool"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-faint text-xs font-mono">{t("emailLabel")}</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          className="px-3 py-1.5 rounded text-sm bg-panel-alt border border-line text-ink focus:outline-none focus:border-cool"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-faint text-xs font-mono">{t("messaggioLabel")}</span>
        <textarea
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
          required
          maxLength={5000}
          rows={6}
          className="px-3 py-1.5 rounded text-sm bg-panel-alt border border-line text-ink focus:outline-none focus:border-cool resize-y"
        />
      </label>

      {stato === "errore" && (
        <p className="text-amber-700 dark:text-amber-400 text-xs font-mono">{t("erroreInvio")}</p>
      )}

      <button
        type="submit"
        disabled={stato === "inCorso"}
        className="mt-1 px-4 py-2 rounded text-sm font-cond font-semibold uppercase tracking-wide bg-cool text-on-accent hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
      >
        {stato === "inCorso" ? t("bottoneInCorso") : t("bottone")}
      </button>
    </form>
  );
}
