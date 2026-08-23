"use client";

import { useEffect, useState } from "react";
import { fetchPassaggiFermata, FERMATE_AUTOBUS, type PassaggioAutobus } from "@/lib/autobus";

const FILTRI = ["tutti", "partenze", "arrivi"] as const;
type Filtro = (typeof FILTRI)[number];

export function AutobusPanel() {
  const [fermataSlug, setFermataSlug] = useState<string>(FERMATE_AUTOBUS[0].slug);
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [passaggi, setPassaggi] = useState<PassaggioAutobus[] | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    const fermata = FERMATE_AUTOBUS.find((f) => f.slug === fermataSlug) ?? FERMATE_AUTOBUS[0];

    async function carica() {
      setStato((s) => (s === "ready" ? s : "loading")); // niente flash "loading" sui refresh automatici
      try {
        const dati = await fetchPassaggiFermata(fermata.stopCode);
        if (!attivo) return;
        setPassaggi(dati);
        setStato("ready");
      } catch {
        if (!attivo) return;
        setStato("error");
      }
    }

    carica();
    // Aggiornamento frequente: dato lato client pensato per essere quasi
    // in tempo reale, stesso intervallo usato dal modulo Ferrovie
    const id = setInterval(carica, 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [fermataSlug]);

  const fermata = FERMATE_AUTOBUS.find((f) => f.slug === fermataSlug) ?? FERMATE_AUTOBUS[0];
  const passaggiFiltrati = passaggi?.filter((p) => {
    if (filtro === "partenze") return p.tipo === "partenza";
    if (filtro === "arrivi") return p.tipo === "arrivo";
    return true;
  });

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        {FERMATE_AUTOBUS.map((f) => (
          <button
            key={f.slug}
            onClick={() => setFermataSlug(f.slug)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              fermataSlug === f.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {f.nome}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-3">
        {FILTRI.map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              filtro === t ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t === "tutti" ? "Tutti" : t === "partenze" ? "Partenze" : "Arrivi"}
          </button>
        ))}
      </div>

      {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento autobus…</p>}
      {stato === "error" && (
        <p className="text-ink-faint text-sm font-mono">
          Dati autobus non disponibili al momento (fonte non ufficiale, può essere temporaneamente irraggiungibile).
        </p>
      )}
      {stato === "ready" && passaggiFiltrati && passaggiFiltrati.length === 0 && (
        <p className="text-ink-dim text-sm">Nessun passaggio in programma a breve.</p>
      )}

      {stato === "ready" && passaggiFiltrati && passaggiFiltrati.length > 0 && (
        <div>
          {passaggiFiltrati.slice(0, 8).map((p, i) => (
            <div key={`${p.linea}-${p.corsa}-${i}`} className={`flex items-center gap-3 py-2 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="font-mono text-xs text-ink-faint w-14 flex-shrink-0">{p.linea}</span>
              <span className="text-ink flex-1 truncate">
                {p.tipo === "partenza" ? "per " : "da "}
                {p.luogo ?? "—"}
              </span>
              <span className="font-mono text-xs text-ink-dim flex-shrink-0">{p.orario ?? "—"}</span>
              {p.binario && (
                <span className="font-mono text-[10px] text-ink-faint flex-shrink-0 hidden sm:inline">bin. {p.binario}</span>
              )}
              <span
                className={`font-mono text-[10px] flex-shrink-0 w-28 text-right ${
                  p.inTempoReale ? "text-allerta-verde" : "text-ink-faint"
                }`}
              >
                {p.inTempoReale ? "in tempo reale" : "programmato"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-ink-faint text-[10px] font-mono mt-3 border-t border-line pt-2">
        Fermata {fermata.nome} · aggiornato dal tuo browser ogni minuto · fonte: TPL FVG (API non ufficiale)
      </p>
    </div>
  );
}
