"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formattaDataRifiuti } from "@/lib/rifiuti";

// Ricerca indirizzo dal vivo per il calendario porta a porta di Trieste
// (AcegasApsAmga/Il Rifiutologo) — 18/09/2026. A differenza del resto
// della sezione Rifiuti (uno snapshot precalcolato una volta al giorno,
// via scripts/ingest-light.mjs), qui non esiste un dato "per comune":
// il calendario di Trieste è per via+civico specifico su una città di
// ~30.000 indirizzi, quindi questo componente interroga in tempo reale i
// proxy same-origin in app/api/rifiuti-trieste/* (v. i commenti estesi
// lì per fonti/endpoint reali confermati) invece di leggere uno
// snapshot Supabase come fa il resto di RifiutiPage.tsx. Scelto
// esplicitamente dall'utente rispetto a "qualche indirizzo di esempio"
// o "rimando per ora".
//
// Flusso a 3 passi, stesso ordine del sito originale: cerca via (elenco
// scaricato una volta, filtrato lato client mentre si digita) → scegli
// civico (saltato automaticamente se l'indirizzo non ne ha di distinti,
// v. commento in app/api/rifiuti-trieste/civici/[idIndirizzo]/route.ts)
// → calendario dei prossimi 31 giorni.

type Indirizzo = { id: number; indirizzo: string; indirizzoGoogle: string | null };
type Civico = { id: number; numeroCivico: string };
type Conferimento = { descrizione: string; orario: string | null; note: string | null; colore: string | null };
type GiornoCalendario = { data: string; conferimenti: Conferimento[] };
type CalendarioTrieste = { nota: string | null; giorni: GiornoCalendario[] };

const MAX_SUGGERIMENTI = 12;

function oggiIsoLocale(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

export function RifiutiTriesteCalendario() {
  const [elenco, setElenco] = useState<Indirizzo[] | null>(null);
  const [elencoStato, setElencoStato] = useState<"idle" | "loading" | "error">("idle");
  const [testoRicerca, setTestoRicerca] = useState("");
  const [suggerimentiAperti, setSuggerimentiAperti] = useState(false);

  const [indirizzo, setIndirizzo] = useState<Indirizzo | null>(null);
  const [civici, setCivici] = useState<Civico[] | null>(null);
  const [civiciStato, setCiviciStato] = useState<"idle" | "loading" | "error">("idle");
  const [civico, setCivico] = useState<Civico | null>(null);

  const [calendario, setCalendario] = useState<CalendarioTrieste | null>(null);
  const [calendarioStato, setCalendarioStato] = useState<"idle" | "loading" | "error">("idle");

  const boxRef = useRef<HTMLDivElement>(null);

  // Chiude i suggerimenti al click fuori dal box di ricerca.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSuggerimentiAperti(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function caricaElenco() {
    if (elenco !== null || elencoStato === "loading") return;
    setElencoStato("loading");
    try {
      const res = await fetch("/api/rifiuti-trieste/indirizzi");
      const dati = await res.json();
      if (!res.ok || !Array.isArray(dati)) throw new Error("risposta non valida");
      setElenco(dati);
      setElencoStato("idle");
    } catch {
      setElencoStato("error");
    }
  }

  const suggerimenti = useMemo(() => {
    if (!elenco || testoRicerca.trim().length < 2) return [];
    const termine = testoRicerca.trim().toLowerCase();
    return elenco.filter((i) => i.indirizzo.toLowerCase().includes(termine)).slice(0, MAX_SUGGERIMENTI);
  }, [elenco, testoRicerca]);

  async function scegliIndirizzo(i: Indirizzo) {
    setIndirizzo(i);
    setTestoRicerca(i.indirizzo);
    setSuggerimentiAperti(false);
    setCivico(null);
    setCivici(null);
    setCalendario(null);
    setCiviciStato("loading");
    try {
      const res = await fetch(`/api/rifiuti-trieste/civici/${i.id}`);
      const dati = await res.json();
      if (!res.ok || !Array.isArray(dati)) throw new Error("risposta non valida");
      setCivici(dati);
      setCiviciStato("idle");
      // Un solo civico fittizio "Tutti i civici" (id -1): nessuna scelta
      // reale da fare, si passa subito al calendario — stesso
      // comportamento del sito originale per le vie senza civici distinti.
      if (dati.length === 1 && dati[0].id === -1) {
        scegliCivico(dati[0], i);
      }
    } catch {
      setCiviciStato("error");
    }
  }

  async function scegliCivico(c: Civico, indirizzoCorrente?: Indirizzo) {
    const ind = indirizzoCorrente ?? indirizzo;
    if (!ind) return;
    setCivico(c);
    setCalendarioStato("loading");
    setCalendario(null);
    try {
      const idCivico = c.id > 0 ? String(c.id) : "";
      const res = await fetch(`/api/rifiuti-trieste/calendario?idIndirizzo=${ind.id}&idCivico=${idCivico}`);
      const dati = await res.json();
      if (!res.ok || !Array.isArray(dati?.giorni)) throw new Error("risposta non valida");
      setCalendario(dati);
      setCalendarioStato("idle");
    } catch {
      setCalendarioStato("error");
    }
  }

  function cambiaIndirizzo() {
    setIndirizzo(null);
    setTestoRicerca("");
    setCivici(null);
    setCivico(null);
    setCalendario(null);
    setCalendarioStato("idle");
    setCiviciStato("idle");
  }

  const oggiIso = oggiIsoLocale();

  return (
    <div>
      <p className="text-ink-faint text-xs font-mono mb-3">
        Calendario per via e numero civico — ricerca dal vivo (non è uno snapshot aggiornato una volta al giorno
        come il resto di questa pagina).
      </p>

      {!indirizzo && (
        <div ref={boxRef} className="relative mb-2">
          <label htmlFor="trieste-via" className="sr-only">
            Cerca una via di Trieste
          </label>
          <input
            id="trieste-via"
            type="text"
            autoComplete="off"
            placeholder="Cerca una via (es. Via del Coroneo)…"
            value={testoRicerca}
            onFocus={() => {
              caricaElenco();
              setSuggerimentiAperti(true);
            }}
            onChange={(e) => {
              setTestoRicerca(e.target.value);
              setSuggerimentiAperti(true);
            }}
            className="w-full border border-line rounded px-2 py-1.5 text-sm font-mono bg-panel text-ink"
          />

          {elencoStato === "loading" && (
            <p className="text-ink-faint text-[10px] font-mono mt-1">Carico l&apos;elenco vie di Trieste…</p>
          )}
          {elencoStato === "error" && (
            <p className="text-allerta-rossa-ink text-[10px] font-mono mt-1">
              Elenco vie non disponibile al momento — riprovare più tardi.
            </p>
          )}

          {suggerimentiAperti && suggerimenti.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-panel border border-line rounded shadow-lg">
              {suggerimenti.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => scegliIndirizzo(s)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-panel-alt text-ink"
                  >
                    {s.indirizzo}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {suggerimentiAperti && elenco && testoRicerca.trim().length >= 2 && suggerimenti.length === 0 && (
            <p className="text-ink-faint text-[10px] font-mono mt-1">Nessuna via trovata.</p>
          )}
        </div>
      )}

      {indirizzo && (
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-ink text-sm">{indirizzo.indirizzo}</span>
            <button
              type="button"
              onClick={cambiaIndirizzo}
              className="text-cool-ink text-[10px] font-mono uppercase hover:underline"
            >
              Cambia indirizzo
            </button>
          </div>

          {civiciStato === "loading" && <p className="text-ink-faint text-xs font-mono">Carico i civici…</p>}
          {civiciStato === "error" && (
            <p className="text-allerta-rossa-ink text-xs font-mono">Civici non disponibili al momento.</p>
          )}

          {civici && civici.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <label htmlFor="trieste-civico" className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                Civico
              </label>
              <select
                id="trieste-civico"
                value={civico?.id ?? ""}
                onChange={(e) => {
                  const c = civici.find((x) => x.id === Number(e.target.value));
                  if (c) scegliCivico(c);
                }}
                className="border border-line rounded px-2 py-1.5 text-sm font-mono bg-panel text-ink"
              >
                <option value="" disabled>
                  Scegli…
                </option>
                {civici.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numeroCivico}
                  </option>
                ))}
              </select>
            </div>
          )}

          {calendarioStato === "loading" && <p className="text-ink-faint text-sm font-mono">Carico il calendario…</p>}
          {calendarioStato === "error" && (
            <p className="text-allerta-rossa-ink text-sm font-mono">Calendario non disponibile al momento.</p>
          )}

          {calendario && (
            <div>
              {calendario.nota && <p className="text-ink-dim text-xs font-mono mb-2">{calendario.nota}</p>}
              {calendario.giorni.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">Nessuna raccolta a calendario nei prossimi giorni per questo indirizzo.</p>
              ) : (
                calendario.giorni.map((g, i) => (
                  <div key={g.data} className={`flex items-start gap-3 py-2 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="font-mono text-ink-dim text-xs w-24 flex-shrink-0 uppercase pt-0.5">
                      {g.data === oggiIso ? "Oggi" : formattaDataRifiuti(g.data)}
                    </div>
                    <div className="flex-1 space-y-1">
                      {g.conferimenti.map((c, ci) => (
                        <div key={ci} className="flex items-start gap-1.5 text-sm">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: c.colore ? `#${c.colore}` : "#8A8F98" }}
                          />
                          <span>
                            {c.descrizione}
                            {c.orario && <span className="text-ink-faint text-xs"> — esposizione {c.orario}</span>}
                            {c.note && <span className="block text-ink-faint text-xs">{c.note}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
