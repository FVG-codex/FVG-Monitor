"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { type Evento, type EventiSnapshot, formattaDataEvento, categorieUniche } from "@/lib/eventi";

// Turismo → Eventi, pagina dedicata (17/09/2026, richiesto dall'utente:
// "Voglio creare una pagina dedicata solamente agli eventi"). Legge
// l'unico snapshot "eventi:turismofvg" (stessa fonte di EventiPanel.tsx
// in homepage) e lo presenta con tab Oggi/Domani/Weekend/Prossimi più un
// filtro categoria lato client. Vedi il commento esteso sopra
// ingestEventi() in scripts/ingest-light.mjs per: perché la pipeline
// proposta da ChatGPT (schema Supabase separato, arricchimento
// pagina-per-pagina) non è stata adottata, come sono stati scoperti i
// selettori reali (HTML fornito dall'utente, non WebFetch) e il limite
// NON ancora verificato in produzione: il filtro start/end di
// turismofvg.it è usato per finestra di 14 giorni, ma non è stato
// possibile testarlo con una richiesta live da questo ambiente
// (turismofvg.it non raggiungibile da qui) — verrà confermato dal primo
// giro reale su GitHub Actions.

const TAB = ["oggi", "domani", "weekend", "prossimi"] as const;

type ChiaveTab = (typeof TAB)[number];

function EventoCard({ evento }: { evento: Evento }) {
  const [immagineFallita, setImmagineFallita] = useState(false);
  const mostraImmagine = evento.immagine && !immagineFallita;
  const tChrome = useTranslations("chrome");

  return (
    <a
      href={evento.link}
      target="_blank"
      rel="noopener noreferrer"
      className="border border-line rounded overflow-hidden bg-panel hover:border-cool transition-colors flex flex-col"
    >
      {mostraImmagine ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={evento.immagine as string}
          alt=""
          loading="lazy"
          className="w-full h-36 object-cover"
          onError={() => setImmagineFallita(true)}
        />
      ) : (
        <div className="w-full h-36 bg-panel-alt flex items-center justify-center text-ink-faint text-[11px] font-mono">
          FVG Monitor
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="font-mono text-cool-ink text-xs flex-shrink-0 w-8 text-center">
            <div className="text-base leading-none">{evento.giorno}</div>
            <div>{evento.mese}</div>
          </div>
          <div className="text-ink-faint text-[10px] font-mono uppercase flex-1">
            {formattaDataEvento(evento.dataIso)}
            {evento.orario && ` · ${evento.orario}`}
          </div>
        </div>
        <div className="text-ink text-sm leading-snug font-semibold">
          {evento.titolo}
          <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
        </div>
        {evento.luogo && <div className="text-ink-faint text-xs font-mono">{evento.luogo}</div>}
        {evento.categoria && (
          <span className="self-start px-2 py-0.5 rounded text-[10px] font-cond font-bold uppercase tracking-wide bg-panel-alt text-ink-dim">
            {evento.categoria}
          </span>
        )}
      </div>
    </a>
  );
}

export function EventiPage() {
  const [dati, setDati] = useState<EventiSnapshot | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<ChiaveTab>("oggi");
  const [categoria, setCategoria] = useState<string>("");
  const t = useTranslations("eventi");
  const tNav = useTranslations("nav");
  const tTurismo = useTranslations("turismo");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "eventi:turismofvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as EventiSnapshot);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const eventiTab: Evento[] = dati ? dati[tab] : [];
  const categorie = useMemo(() => categorieUniche(dati?.prossimi ?? []), [dati]);
  const eventiFiltrati = categoria ? eventiTab.filter((e) => e.categoria === categoria) : eventiTab;

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/turismo" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("turismo")}
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {tTurismo("sezioni.eventi.nome")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {t("descrizione")}
          {dati?.finestra && t("finestraSuffisso", { da: dati.finestra.da, a: dati.finestra.a })}
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {TAB.map((chiave) => (
              <button
                key={chiave}
                onClick={() => setTab(chiave)}
                aria-pressed={tab === chiave}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  tab === chiave ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {t(`tab.${chiave}`)}
              </button>
            ))}
          </div>

          {categorie.length > 0 && (
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="border border-line rounded px-2 py-1.5 text-xs font-mono bg-panel text-ink-dim"
            >
              <option value="">{t("tutteLeCategorie")}</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>}

        {stato === "ready" && dati && (
          <>
            {eventiFiltrati.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">{t("nessunEvento")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventiFiltrati.map((e) => (
                  <EventoCard key={`${e.link}|${e.dataIso}`} evento={e} />
                ))}
              </div>
            )}
            <p className="text-ink-faint text-[10px] font-mono mt-6 border-t border-line pt-3">
              {t("aggiornato", {
                data: new Date(dati.aggiornato_al).toLocaleString(locale === "en" ? "en-GB" : "it-IT"),
              })}
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
