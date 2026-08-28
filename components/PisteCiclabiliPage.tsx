"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE } from "@/lib/province";
import {
  type SnapshotPisteCiclabili,
  type SnapshotPisteCiclabiliTurismoFvg,
  type PercorsoTurismoFvgBike,
  raggruppaPerNome,
  formattaLunghezza,
  formattaDurata,
  etichettaPartenzaArrivo,
} from "@/lib/pisteCiclabili";

const PisteCiclabiliMap = dynamic(() => import("@/components/PisteCiclabiliMap").then((m) => m.PisteCiclabiliMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

// Centro geografico del bounding box reale dei dati Regione (verificato
// il 27/08/2026 con $select=extent(the_geom): lon 12.42–13.49, lat
// 45.72–46.12) — non il centro della regione, perché la copertura non è
// regionale (vedi disclaimer in pagina e nota in lib/pisteCiclabili.ts).
// Riusato anche come vista di default con la seconda fonte attiva: i
// percorsi turismofvg.it serie R ricadono nella stessa area centrale.
const CENTRO_DATI: [number, number] = [45.92, 12.96];

// Etichetta breve per il popup/elenco di un percorso turismofvg.it —
// solo i campi noti, mai un trattino o uno zero per un dato mancante.
function etichettaBreveTurismoFvg(p: PercorsoTurismoFvgBike): string {
  const parti: string[] = [p.codice];
  if (p.difficolta) parti.push(p.difficolta);
  if (p.durataMin !== null) parti.push(formattaDurata(p.durataMin));
  return parti.join(" · ");
}

export function PisteCiclabiliPage() {
  const [dati, setDati] = useState<SnapshotPisteCiclabili | null>(null);
  const [datiTurismoFvg, setDatiTurismoFvg] = useState<SnapshotPisteCiclabiliTurismoFvg | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [ricerca, setRicerca] = useState("");
  // Percorso selezionato cliccando il nome nell'elenco (27/08/2026,
  // richiesto dall'utente) — chiave univoca fra le due fonti (vedi
  // TracciatoMappa in PisteCiclabiliMap.tsx), passata alla mappa per
  // zoom+evidenziazione.
  const [percorsoSelezionato, setPercorsoSelezionato] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const [regione, turismoFvg] = await Promise.all([
        supabase.from("snapshots").select("data").eq("id", "piste-ciclabili").single(),
        supabase.from("snapshots").select("data").eq("id", "piste-ciclabili-turismofvg").single(),
      ]);
      if (!attivo) return;
      if (regione.error || !regione.data) {
        setStato("error");
        return;
      }
      setDati(regione.data.data as SnapshotPisteCiclabili);
      // La seconda fonte è opzionale: se non è ancora disponibile (prima
      // esecuzione dell'ingestione dopo il rilascio di questa funzione,
      // o errore isolato) la pagina resta comunque utilizzabile con la
      // sola fonte Regione, senza bloccarsi in stato di errore.
      if (!turismoFvg.error && turismoFvg.data) {
        setDatiTurismoFvg(turismoFvg.data.data as SnapshotPisteCiclabiliTurismoFvg);
      }
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const percorsiRegione = useMemo(
    () => raggruppaPerNome(dati?.segmenti ?? [], dati?.arricchimento ?? {}),
    [dati]
  );

  const percorsiTurismoFvg = useMemo(() => {
    const dettagli = datiTurismoFvg?.dettagli ?? {};
    return Object.values(dettagli).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [datiTurismoFvg]);

  const percorsiRegioneFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return percorsiRegione;
    return percorsiRegione.filter((p) => p.nome.toLowerCase().includes(q));
  }, [percorsiRegione, ricerca]);

  const percorsiTurismoFvgFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return percorsiTurismoFvg;
    return percorsiTurismoFvg.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.codice.toLowerCase().includes(q)
    );
  }, [percorsiTurismoFvg, ricerca]);

  const tracciati = useMemo(() => {
    const daRegione = percorsiRegioneFiltrati.flatMap((p) =>
      p.segmenti.map((s) => ({
        chiave: `regione:${p.nome}`,
        fonte: "regione" as const,
        nome: p.nome,
        linee: s.linee,
        extra: s.lunghezzaM !== null ? formattaLunghezza(s.lunghezzaM) : null,
      }))
    );
    const daTurismoFvg = percorsiTurismoFvgFiltrati.map((p) => ({
      chiave: `turismofvg:${p.id}`,
      fonte: "turismofvg" as const,
      nome: p.nome,
      linee: p.linee,
      extra: etichettaBreveTurismoFvg(p),
    }));
    return [...daRegione, ...daTurismoFvg];
  }, [percorsiRegioneFiltrati, percorsiTurismoFvgFiltrati]);

  const totalePercorsi = percorsiRegioneFiltrati.length + percorsiTurismoFvgFiltrati.length;

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Piste Ciclabili</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {totalePercorsi > 0 ? `${totalePercorsi} percorsi` : "Percorsi"} ciclabili in Friuli Venezia Giulia — fonti:
          Regione Autonoma FVG (dati.friuliveneziagiulia.it) e turismofvg.it (percorsi ad anello, serie R).
        </p>
        <p className="text-ink-faint text-xs font-mono mb-4">
          <strong className="text-ink-dim">Due fonti indipendenti</strong>, mostrate insieme ma non unite: i dati
          Regione hanno <strong className="text-ink-dim">copertura parziale</strong> (solo tracciati trasmessi dai
          Comuni in una specifica procedura urbanistica, non un censimento completo — es. l&apos;area di Trieste non
          è coperta) e possono essere divisi in più tratti, con comune di partenza/arrivo e provincia calcolati dalle
          coordinate (non sempre disponibili). I percorsi turismofvg.it (contrassegnati &quot;R0XX&quot;) sono
          itinerari turistici ufficiali ad anello, con tracciato completo e dati tecnici (lunghezza, dislivelli,
          difficoltà, durata) letti dalla scheda di ciascun percorso — al momento solo la serie &quot;anelli&quot;,
          non l&apos;intero catalogo del sito.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento percorsi…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati piste ciclabili non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <>
            <label className="block mb-4">
              <span className="sr-only">Cerca per nome o codice del percorso</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca per nome o codice del percorso…"
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={`Elenco (${totalePercorsi})`}>
                {totalePercorsi === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessun percorso trovato.</p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {percorsiRegioneFiltrati.length > 0 && (
                      <div className="px-1 py-2 font-mono text-[10px] text-ink-faint uppercase tracking-wide bg-panel-alt/40">
                        Regione FVG ({percorsiRegioneFiltrati.length})
                      </div>
                    )}
                    {percorsiRegioneFiltrati.map((p, i) => {
                      const chiave = `regione:${p.nome}`;
                      const etichetta = etichettaPartenzaArrivo(p);
                      const selezionato = percorsoSelezionato === chiave;
                      return (
                        <button
                          key={chiave}
                          onClick={() => setPercorsoSelezionato(selezionato ? null : chiave)}
                          aria-pressed={selezionato}
                          className={`py-3 text-left w-full ${i > 0 ? "border-t border-line" : ""} ${
                            selezionato ? "bg-panel-alt" : "hover:bg-panel-alt/60"
                          } transition-colors`}
                        >
                          <div className="flex items-baseline justify-between gap-2 min-w-0">
                            <span className="text-sm font-semibold truncate">{p.nome}</span>
                            {p.provincia && (
                              <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                                {PROVINCE[p.provincia].nome}
                              </span>
                            )}
                          </div>
                          {etichetta && (
                            <div className="text-ink-dim text-xs mt-0.5">
                              {etichetta}
                              {p.partenzaArrivoApprossimati ? " (indicativo)" : ""}
                            </div>
                          )}
                          <div className="font-mono text-[10px] text-ink-dim mt-1">
                            {p.lunghezzaTotaleM !== null
                              ? `${formattaLunghezza(p.lunghezzaTotaleM)}${p.lunghezzaParziale ? " (parziale)" : ""}`
                              : "Lunghezza non disponibile"}
                            {p.segmenti.length > 1 ? ` · ${p.segmenti.length} tratti` : ""}
                          </div>
                        </button>
                      );
                    })}

                    {percorsiTurismoFvgFiltrati.length > 0 && (
                      <div className="px-1 py-2 font-mono text-[10px] text-ink-faint uppercase tracking-wide bg-panel-alt/40 border-t border-line">
                        TurismoFVG — anelli ({percorsiTurismoFvgFiltrati.length})
                      </div>
                    )}
                    {percorsiTurismoFvgFiltrati.map((p, i) => {
                      const chiave = `turismofvg:${p.id}`;
                      const selezionato = percorsoSelezionato === chiave;
                      const partenzaArrivo =
                        p.anello && p.partenza
                          ? p.partenza.nome
                          : p.partenza && p.arrivo
                            ? `Da ${p.partenza.nome} a ${p.arrivo.nome}`
                            : null;
                      return (
                        <button
                          key={chiave}
                          onClick={() => setPercorsoSelezionato(selezionato ? null : chiave)}
                          aria-pressed={selezionato}
                          className={`py-3 text-left w-full ${i > 0 ? "border-t border-line" : ""} ${
                            selezionato ? "bg-panel-alt" : "hover:bg-panel-alt/60"
                          } transition-colors`}
                        >
                          <div className="flex items-baseline justify-between gap-2 min-w-0">
                            <span className="text-sm font-semibold truncate">{p.nome}</span>
                            {p.provincia && (
                              <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                                {PROVINCE[p.provincia].nome}
                              </span>
                            )}
                          </div>
                          {(partenzaArrivo || p.comuni.length > 0) && (
                            <div className="text-ink-dim text-xs mt-0.5">
                              {partenzaArrivo ?? p.comuni.join(", ")}
                            </div>
                          )}
                          <div className="font-mono text-[10px] text-ink-dim mt-1">
                            {etichettaBreveTurismoFvg(p)}
                            {p.lunghezzaM !== null ? ` · ${formattaLunghezza(p.lunghezzaM)}` : ""}
                            {p.dislivelloSalitaM !== null ? ` · ↑${Math.round(p.dislivelloSalitaM)} m` : ""}
                          </div>
                          {p.gpxUrl && (
                            <a
                              href={p.gpxUrl}
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-cool hover:underline mt-1 inline-block"
                            >
                              Scarica GPX ↗
                            </a>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title="Mappa">
                {percorsoSelezionato && (
                  <button
                    onClick={() => setPercorsoSelezionato(null)}
                    className="font-mono text-[10px] text-cool hover:underline mb-2 inline-block"
                  >
                    ← Mostra tutta la mappa
                  </button>
                )}
                <div
                  role="region"
                  aria-label="Mappa dei percorsi ciclabili in Friuli Venezia Giulia — elenco testuale equivalente nel pannello a fianco. Cliccare un percorso nell'elenco per evidenziarlo qui."
                  style={{ height: percorsoSelezionato ? 434 : 460 }}
                  className="rounded overflow-hidden"
                >
                  <PisteCiclabiliMap tracciati={tracciati} centro={CENTRO_DATI} evidenziato={percorsoSelezionato} />
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
