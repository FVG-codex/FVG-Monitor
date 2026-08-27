"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { type SnapshotPisteCiclabili, raggruppaPerNome, formattaLunghezza } from "@/lib/pisteCiclabili";

const PisteCiclabiliMap = dynamic(() => import("@/components/PisteCiclabiliMap").then((m) => m.PisteCiclabiliMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

// Centro geografico del bounding box reale dei dati (verificato il
// 27/08/2026 con $select=extent(the_geom): lon 12.42–13.49, lat
// 45.72–46.12) — non il centro della regione, perché la copertura non è
// regionale (vedi disclaimer in pagina e nota in lib/pisteCiclabili.ts).
const CENTRO_DATI: [number, number] = [45.92, 12.96];

export function PisteCiclabiliPage() {
  const [dati, setDati] = useState<SnapshotPisteCiclabili | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [ricerca, setRicerca] = useState("");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "piste-ciclabili").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotPisteCiclabili);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const percorsi = useMemo(() => raggruppaPerNome(dati?.segmenti ?? []), [dati]);

  const percorsiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return percorsi;
    return percorsi.filter((p) => p.nome.toLowerCase().includes(q));
  }, [percorsi, ricerca]);

  const segmentiFiltrati = useMemo(
    () => percorsiFiltrati.flatMap((p) => p.segmenti),
    [percorsiFiltrati]
  );

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Piste Ciclabili</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {percorsi.length > 0 ? `${percorsi.length} percorsi` : "Percorsi"} ciclabili in Friuli Venezia Giulia —
          fonte: Regione Autonoma FVG (dati.friuliveneziagiulia.it).
        </p>
        <p className="text-ink-faint text-xs font-mono mb-4">
          <strong className="text-ink-dim">Copertura parziale</strong>: solo i tracciati che i singoli Comuni hanno
          trasmesso alla Regione in una specifica procedura urbanistica (&quot;conformazione&quot;) — non è un
          censimento completo della rete ciclabile regionale, e non copre tutte le zone (es. l&apos;area di
          Trieste). La lunghezza di un percorso può essere sottostimata quando manca per alcuni dei suoi tratti.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento percorsi…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati piste ciclabili non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <>
            <label className="block mb-4">
              <span className="sr-only">Cerca per nome del percorso</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca per nome del percorso…"
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={`Elenco (${percorsiFiltrati.length})`}>
                {percorsiFiltrati.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessun percorso trovato.</p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {percorsiFiltrati.map((p, i) => (
                      <div key={p.nome} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{p.nome}</span>
                        </div>
                        <div className="font-mono text-[10px] text-ink-dim mt-1">
                          {p.lunghezzaTotaleM !== null
                            ? `${formattaLunghezza(p.lunghezzaTotaleM)}${p.lunghezzaParziale ? " (parziale)" : ""}`
                            : "Lunghezza non disponibile"}
                          {p.segmenti.length > 1 ? ` · ${p.segmenti.length} tratti` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Mappa">
                <div
                  role="region"
                  aria-label="Mappa dei percorsi ciclabili in Friuli Venezia Giulia — elenco testuale equivalente nel pannello a fianco"
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <PisteCiclabiliMap segmenti={segmentiFiltrati} centro={CENTRO_DATI} />
                </div>
              </Panel>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
