"use client";

import { useEffect, useState } from "react";
import { fetchPassaggiBlocco, BLOCCHI_AUTOBUS, type PassaggioAutobus } from "@/lib/autobus";

const FILTRI = ["tutti", "partenze", "arrivi"] as const;
type Filtro = (typeof FILTRI)[number];

export function AutobusPanel() {
  const [bloccoSlug, setBloccoSlug] = useState<string>(BLOCCHI_AUTOBUS[0].slug);
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [passaggi, setPassaggi] = useState<PassaggioAutobus[] | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    const blocco = BLOCCHI_AUTOBUS.find((b) => b.slug === bloccoSlug) ?? BLOCCHI_AUTOBUS[0];

    async function carica() {
      setStato((s) => (s === "ready" ? s : "loading")); // niente flash "loading" sui refresh automatici
      try {
        const dati = await fetchPassaggiBlocco(blocco);
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
  }, [bloccoSlug]);

  const blocco = BLOCCHI_AUTOBUS.find((b) => b.slug === bloccoSlug) ?? BLOCCHI_AUTOBUS[0];
  const passaggiFiltrati = passaggi?.filter((p) => {
    if (filtro === "partenze") return p.tipo === "partenza";
    if (filtro === "arrivi") return p.tipo === "arrivo";
    return true;
  });

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        {BLOCCHI_AUTOBUS.map((b) => (
          <button
            key={b.slug}
            onClick={() => setBloccoSlug(b.slug)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              bloccoSlug === b.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {b.nome}
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
          {passaggiFiltrati.slice(0, 12).map((p, i) => (
            <div key={`${p.linea}-${p.corsa}-${p.fermataCodice}-${i}`} className={`py-2 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink-faint w-14 flex-shrink-0">{p.linea}</span>
                {/* min-w-0 è necessario perché "truncate" funzioni
                    davvero dentro un flex item — vedi stessa nota in
                    TreniPanel.tsx */}
                <span className="text-ink flex-1 min-w-0 truncate">
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
              {/* Fermata fisica di origine: più fermate del blocco possono
                  condividere lo stesso indirizzo (es. pensiline diverse
                  della Stazione Ferroviaria), quindi mostriamo anche il
                  codice per distinguerle davvero. */}
              <p className="font-mono text-[10px] text-ink-faint mt-0.5 pl-[68px] truncate">
                {p.fermataNome || "Fermata"} · {p.fermataCodice}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-ink-faint text-[10px] font-mono mt-3 border-t border-line pt-2">
        Blocco {blocco.nome} ({blocco.fermate.length} fermate) · aggiornato dal tuo browser ogni minuto · fonte: TPL FVG (API non ufficiale)
      </p>
    </div>
  );
}
