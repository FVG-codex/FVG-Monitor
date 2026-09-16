"use client";

import { useEffect, useState } from "react";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import {
  COMPRENSORI,
  type SnapshotNeveImpianti,
  type DatiLiveComprensorio,
  ETICHETTA_STATO,
  classeBadgeStato,
  formattaConteggio,
  formattaNeve,
  formattaOra,
} from "@/lib/neveImpianti";

const LIVE_VUOTO: DatiLiveComprensorio = {
  stato: "sconosciuto",
  temperaturaC: null,
  neveSuPista: null,
  neveMinCm: null,
  neveMaxCm: null,
  impiantiAperti: null,
  impiantiTotali: null,
  pisteApertePct: null,
  tappetiAperti: null,
  tappetiTotali: null,
  struttureAperte: null,
  struttureTotali: null,
  fondoAperto: null,
  fondoTotale: null,
  orari: null,
  osservatoIl: null,
  controllatoIl: null,
  stale: true,
  errore: null,
};

// Turismo → Neve & Impianti (16/09/2026, vedi lib/neveImpianti.ts e il
// commento esteso sopra ingestNeveImpianti() in scripts/ingest-light.mjs
// per fonte e metodo di verifica). Niente mappa: i 7 poli sono
// destinazioni note, non indirizzi da geolocalizzare — pagina ufficiale
// + webcam per ciascuno bastano, stesso principio già seguito per le
// Strutture ricettive (niente mappa, dato senza coordinate dalla
// fonte).
export function NeveImpiantiPage() {
  const [snapshot, setSnapshot] = useState<SnapshotNeveImpianti | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "neve-impianti").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setSnapshot(data.data as SnapshotNeveImpianti);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/turismo" className="text-cool-ink text-xs font-mono hover:underline">
          ← Turismo
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">Neve &amp; Impianti</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Stato impianti, piste e condizioni meteo dei 7 poli sciistici del Friuli Venezia Giulia — fonte: TurismoFVG,
          aggiornata ogni 15 minuti in stagione invernale. Il programma di apertura impianti è indicativo e può
          variare senza preavviso per motivi meteo/operativi: verificare sempre con il gestore prima di partire.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati Neve &amp; Impianti non disponibili al momento.</p>
        )}

        {stato === "ready" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
            {COMPRENSORI.map((c) => {
              const live = snapshot?.perComprensorio?.[c.slug] ?? LIVE_VUOTO;
              return (
                <Panel key={c.slug} title={c.nome}>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-cond font-bold uppercase tracking-wide ${classeBadgeStato(live.stato)}`}
                    >
                      {ETICHETTA_STATO[live.stato]}
                    </span>
                    {live.stale && (
                      <span className="text-[10px] font-mono uppercase text-allerta-arancione-ink">
                        dato non aggiornato dall&apos;ultima verifica
                      </span>
                    )}
                  </div>

                  <div className="text-ink-dim text-xs mb-2">
                    {c.comune}
                    {c.provincia ? ` (${c.provincia})` : ""} ·{" "}
                    {c.altitudineMinM !== null && c.altitudineMaxM !== null
                      ? `${c.altitudineMinM}–${c.altitudineMaxM} m`
                      : "altitudine n/d"}{" "}
                    · {c.downhillKm !== null ? `${c.downhillKm} km discesa` : "discesa n/d"}
                    {c.fondoKm !== null ? ` · ${c.fondoKm} km fondo` : ""}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-2">
                    <div>
                      <div className="text-base font-semibold">
                        {live.temperaturaC !== null ? `${live.temperaturaC}°C` : "---"}
                      </div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">temperatura</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">{formattaNeve(live)}</div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">neve in pista</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">
                        {formattaConteggio(live.impiantiAperti, live.impiantiTotali ?? c.impiantiCount)}
                      </div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">impianti aperti</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">
                        {live.pisteApertePct !== null ? `${live.pisteApertePct}%` : "n/d"}
                      </div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">piste aperte</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">
                        {formattaConteggio(live.tappetiAperti, live.tappetiTotali ?? c.tappetiCount)}
                      </div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">tappeti aperti</div>
                    </div>
                    <div>
                      <div className="text-base font-semibold">{formattaConteggio(live.fondoAperto, live.fondoTotale)}</div>
                      <div className="text-ink-faint text-[10px] font-mono uppercase">fondo aperto</div>
                    </div>
                  </div>

                  {live.orari && <div className="text-ink-dim text-xs mb-2">Orari impianti: {live.orari}</div>}

                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={c.paginaUfficiale}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-cool-ink hover:underline"
                    >
                      Pagina ufficiale →<span className="sr-only"> (si apre in una nuova scheda)</span>
                    </a>
                    <a
                      href={c.paginaWebcam}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-cool-ink hover:underline"
                    >
                      Webcam →<span className="sr-only"> (si apre in una nuova scheda)</span>
                    </a>
                  </div>

                  <div className="text-ink-faint text-[10px] font-mono mt-2">
                    Ultimo dato: {formattaOra(live.osservatoIl)}
                    {live.controllatoIl && live.controllatoIl !== live.osservatoIl
                      ? ` · ultimo tentativo: ${formattaOra(live.controllatoIl)}`
                      : ""}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
