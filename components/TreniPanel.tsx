"use client";

import { useEffect, useState } from "react";
import { fetchArrivi, fetchPartenze, STAZIONI_TRENI, type Treno } from "@/lib/treni";

const STATO_COLORE: Record<Treno["stato"], string> = {
  cancellato: "text-allerta-rossa",
  modificato: "text-allerta-arancione",
  "non-partito": "text-ink-faint",
  ritardo: "text-warm",
  anticipo: "text-cool",
  orario: "text-ink-dim",
};

export function TreniPanel() {
  const [stazioneSlug, setStazioneSlug] = useState<string>(STAZIONI_TRENI[0].slug);
  const [sottoTab, setSottoTab] = useState<"partenze" | "arrivi">("partenze");
  const [treni, setTreni] = useState<Treno[] | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    const stazione = STAZIONI_TRENI.find((s) => s.slug === stazioneSlug) ?? STAZIONI_TRENI[0];

    async function carica() {
      setStato((s) => (s === "ready" ? s : "loading")); // niente flash "loading" sui refresh automatici
      try {
        const dati = sottoTab === "partenze" ? await fetchPartenze(stazione.codice) : await fetchArrivi(stazione.codice);
        if (!attivo) return;
        setTreni(dati);
        setStato("ready");
      } catch {
        if (!attivo) return;
        setStato("error");
      }
    }

    carica();
    // Aggiornamento frequente: dato lato client pensato per essere
    // quasi in tempo reale (i treni partono nel giro di minuti), a
    // differenza degli altri moduli del sito che girano ogni 15 minuti
    const id = setInterval(carica, 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [stazioneSlug, sottoTab]);

  const stazione = STAZIONI_TRENI.find((s) => s.slug === stazioneSlug) ?? STAZIONI_TRENI[0];

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        {STAZIONI_TRENI.map((s) => (
          <button
            key={s.slug}
            onClick={() => setStazioneSlug(s.slug)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              stazioneSlug === s.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {s.nome}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-3">
        {(["partenze", "arrivi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSottoTab(t)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              sottoTab === t ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t === "partenze" ? "Partenze" : "Arrivi"}
          </button>
        ))}
      </div>

      {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento treni…</p>}
      {stato === "error" && (
        <p className="text-ink-faint text-sm font-mono">
          Dati treni non disponibili al momento (fonte non ufficiale, può essere temporaneamente irraggiungibile).
        </p>
      )}
      {stato === "ready" && treni && treni.length === 0 && (
        <p className="text-ink-dim text-sm">Nessun treno in programma a breve.</p>
      )}

      {stato === "ready" && treni && treni.length > 0 && (
        <div>
          {treni.slice(0, 8).map((t, i) => (
            <div key={`${t.numeroTreno}-${i}`} className={`flex items-center gap-3 py-2 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="font-mono text-xs text-ink-faint w-20 flex-shrink-0">
                {t.categoria} {t.numeroTreno}
              </span>
              {/* min-w-0 è necessario perché "truncate" funzioni davvero
                  dentro un flex item: senza, il browser usa la larghezza
                  del testo non troncato come larghezza minima e la riga
                  trabocca invece di accorciarsi (bug comune di flexbox) */}
              <span className="text-ink flex-1 min-w-0 truncate">{t.luogo ?? "—"}</span>
              <span className="font-mono text-xs text-ink-dim flex-shrink-0">{t.orarioTesto ?? "—"}</span>
              {t.binario && (
                <span className="font-mono text-[10px] text-ink-faint flex-shrink-0 hidden sm:inline">bin. {t.binario}</span>
              )}
              <span className={`font-mono text-[10px] flex-shrink-0 w-24 text-right ${STATO_COLORE[t.stato]}`}>
                {t.statoTesto}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-ink-faint text-[10px] font-mono mt-3 border-t border-line pt-2">
        Stazione {stazione.nome} · aggiornato dal tuo browser ogni minuto · fonte: ViaggiaTreno (Trenitalia/RFI,
        API non ufficiale)
      </p>
    </div>
  );
}
