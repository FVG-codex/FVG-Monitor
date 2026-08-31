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
  type SnapshotCiclovie2020,
  SERIE_TURISMOFVG_BIKE,
  raggruppaPerNome,
  raggruppaCiclovie2020,
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
// Riusato anche come vista di default con le fonti turismofvg.it attive:
// i loro percorsi ricadono nella stessa area centrale.
const CENTRO_DATI: [number, number] = [45.92, 12.96];

// Etichetta breve per il popup/elenco di un percorso turismofvg.it —
// solo i campi noti, mai un trattino o uno zero per un dato mancante.
function etichettaBreveTurismoFvg(p: PercorsoTurismoFvgBike): string {
  const parti: string[] = [p.codice];
  if (p.difficolta) parti.push(p.difficolta);
  if (p.durataMin !== null) parti.push(formattaDurata(p.durataMin));
  return parti.join(" · ");
}

// Un riquadro/box per UNA delle 4 serie turismofvg.it (28/08/2026,
// richiesto esplicitamente dall'utente: "che siano ognuna in un box
// differente" invece dei due gruppi dentro un unico Elenco della prima
// versione). Stessa resa per tutte e 4 le serie — solo etichetta,
// elenco e chiave di selezione cambiano.
function BoxSerieTurismoFvg({
  fonte,
  etichetta,
  percorsi,
  disponibile,
  percorsoSelezionato,
  setPercorsoSelezionato,
}: {
  fonte: "r" | "p" | "c" | "m";
  etichetta: string;
  percorsi: PercorsoTurismoFvgBike[];
  disponibile: boolean;
  percorsoSelezionato: string | null;
  setPercorsoSelezionato: (chiave: string | null) => void;
}) {
  return (
    <Panel title={`${etichetta} (${percorsi.length})`}>
      {!disponibile ? (
        <p className="text-ink-faint text-sm font-mono">Dati non ancora disponibili.</p>
      ) : percorsi.length === 0 ? (
        <p className="text-ink-faint text-sm font-mono">Nessun percorso trovato.</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto flex flex-col">
          {percorsi.map((p, i) => {
            const chiave = `${fonte}:${p.id}`;
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
                  <div className="text-ink-dim text-xs mt-0.5">{partenzaArrivo ?? p.comuni.join(", ")}</div>
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
  );
}

export function PisteCiclabiliPage() {
  const [dati, setDati] = useState<SnapshotPisteCiclabili | null>(null);
  const [datiSerie, setDatiSerie] = useState<
    Partial<Record<"r" | "p" | "c" | "m", SnapshotPisteCiclabiliTurismoFvg>>
  >({});
  const [datiCiclovie2020, setDatiCiclovie2020] = useState<SnapshotCiclovie2020 | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [ricerca, setRicerca] = useState("");
  // Percorso selezionato cliccando il nome nell'elenco (27/08/2026,
  // richiesto dall'utente) — chiave univoca fra tutte le fonti (vedi
  // TracciatoMappa in PisteCiclabiliMap.tsx), passata alla mappa per
  // zoom+evidenziazione.
  const [percorsoSelezionato, setPercorsoSelezionato] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const [regione, ciclovie2020, ...serie] = await Promise.all([
        supabase.from("snapshots").select("data").eq("id", "piste-ciclabili").single(),
        supabase.from("snapshots").select("data").eq("id", "piste-ciclabili-2020").single(),
        ...SERIE_TURISMOFVG_BIKE.map((s) => supabase.from("snapshots").select("data").eq("id", s.idSnapshot).single()),
      ]);
      if (!attivo) return;
      if (regione.error || !regione.data) {
        setStato("error");
        return;
      }
      setDati(regione.data.data as SnapshotPisteCiclabili);
      // Ciclovie 2020 (28/08/2026) è opzionale come le 4 serie turismofvg.it
      // sotto — se non ancora disponibile (prima esecuzione dopo il
      // rilascio) la pagina resta comunque utilizzabile con le altre fonti.
      if (!ciclovie2020.error && ciclovie2020.data) {
        setDatiCiclovie2020(ciclovie2020.data.data as SnapshotCiclovie2020);
      }
      // Le 4 fonti turismofvg.it sono opzionali: se una non è ancora
      // disponibile (prima esecuzione dell'ingestione dopo il rilascio,
      // o errore isolato su una singola serie) la pagina resta comunque
      // utilizzabile con le altre fonti, senza bloccarsi in errore — il
      // relativo box mostra semplicemente "Dati non ancora disponibili".
      const nuovoDatiSerie: Partial<Record<"r" | "p" | "c" | "m", SnapshotPisteCiclabiliTurismoFvg>> = {};
      SERIE_TURISMOFVG_BIKE.forEach((s, i) => {
        const risultato = serie[i];
        if (!risultato.error && risultato.data) {
          nuovoDatiSerie[s.chiave] = risultato.data.data as SnapshotPisteCiclabiliTurismoFvg;
        }
      });
      setDatiSerie(nuovoDatiSerie);
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

  const percorsiRegioneFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return percorsiRegione;
    return percorsiRegione.filter((p) => p.nome.toLowerCase().includes(q));
  }, [percorsiRegione, ricerca]);

  const percorsiCiclovie2020 = useMemo(
    () => raggruppaCiclovie2020(datiCiclovie2020?.segmenti ?? []),
    [datiCiclovie2020]
  );

  const percorsiCiclovie2020Filtrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return percorsiCiclovie2020;
    return percorsiCiclovie2020.filter((p) => p.nome.toLowerCase().includes(q));
  }, [percorsiCiclovie2020, ricerca]);

  // Per ciascuna delle 4 serie: elenco ordinato e filtrato dalla ricerca
  // (per nome o codice) — stessa logica già usata per Regione, ripetuta
  // una volta per serie invece che scritta a mano 4 volte.
  const percorsiSerieFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    const risultato: Record<"r" | "p" | "c" | "m", PercorsoTurismoFvgBike[]> = { r: [], p: [], c: [], m: [] };
    for (const s of SERIE_TURISMOFVG_BIKE) {
      const dettagli = datiSerie[s.chiave]?.dettagli ?? {};
      const tutti = Object.values(dettagli).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
      risultato[s.chiave] = q
        ? tutti.filter((p) => p.nome.toLowerCase().includes(q) || p.codice.toLowerCase().includes(q))
        : tutti;
    }
    return risultato;
  }, [datiSerie, ricerca]);

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
    const daSerie = SERIE_TURISMOFVG_BIKE.flatMap((s) =>
      percorsiSerieFiltrati[s.chiave].map((p) => ({
        chiave: `${s.chiave}:${p.id}`,
        fonte: s.chiave,
        nome: p.nome,
        linee: p.linee,
        extra: etichettaBreveTurismoFvg(p),
      }))
    );
    const daCiclovie2020 = percorsiCiclovie2020Filtrati.flatMap((p) =>
      p.segmenti.map((s) => ({
        chiave: `ciclovie2020:${p.nome}`,
        fonte: "ciclovie2020" as const,
        nome: p.nome,
        linee: s.linee,
        extra: s.stato,
      }))
    );
    return [...daRegione, ...daSerie, ...daCiclovie2020];
  }, [percorsiRegioneFiltrati, percorsiSerieFiltrati, percorsiCiclovie2020Filtrati]);

  const totalePercorsi =
    percorsiRegioneFiltrati.length +
    percorsiCiclovie2020Filtrati.length +
    SERIE_TURISMOFVG_BIKE.reduce((tot, s) => tot + percorsiSerieFiltrati[s.chiave].length, 0);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Piste Ciclabili</h1>
        <p className="text-ink-faint text-xs font-mono mb-2">
          {totalePercorsi > 0 ? `${totalePercorsi} percorsi` : "Percorsi"} ciclabili in Friuli Venezia Giulia — 6
          fonti indipendenti: le 4 serie con codice di turismofvg.it (Anelli, Percorsi lineari, Ciclovie a tappe,
          Mountain bike), la Regione Autonoma FVG (dati.friuliveneziagiulia.it) e il dataset storico Ciclovie 2020.
        </p>
        <p className="text-ink-faint text-xs font-mono mb-4">
          <strong className="text-ink-dim">Fonti indipendenti, mai unite fra loro</strong> — ogni fonte ha il proprio
          riquadro qui sotto e il proprio colore sulla mappa. I percorsi turismofvg.it (codice tra parentesi, es.
          &quot;R001&quot;) sono itinerari turistici ufficiali con tracciato completo e dati tecnici (lunghezza,
          dislivelli, difficoltà, durata) letti dalla scheda di ciascun percorso, più un link diretto per scaricare
          il GPX. I dati Regione FVG hanno invece <strong className="text-ink-dim">copertura parziale</strong> (solo
          tracciati trasmessi dai Comuni in una specifica procedura urbanistica, non un censimento completo —
          es. l&apos;area di Trieste non è coperta) e possono essere divisi in più tratti, con comune di
          partenza/arrivo e provincia calcolati dalle coordinate quando possibile. Ciclovie 2020 è invece un{" "}
          <strong className="text-ink-dim">dato storico, fermo al gennaio 2020</strong> (copertura regionale
          completa, Trieste inclusa) — mostrato come layer di contesto, non come stato attuale della rete.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
              {SERIE_TURISMOFVG_BIKE.map((s) => (
                <BoxSerieTurismoFvg
                  key={s.chiave}
                  fonte={s.chiave}
                  etichetta={s.etichetta}
                  percorsi={percorsiSerieFiltrati[s.chiave]}
                  disponibile={datiSerie[s.chiave] !== undefined}
                  percorsoSelezionato={percorsoSelezionato}
                  setPercorsoSelezionato={setPercorsoSelezionato}
                />
              ))}

              {/* Regione FVG — riquadro a sé, in fondo (fonte più datata e
                  con copertura parziale, mostrata per ultima rispetto alle
                  4 serie turismofvg.it, come richiesto dall'utente). */}
              <Panel title={`Regione FVG (${percorsiRegioneFiltrati.length})`} span={2}>
                {percorsiRegioneFiltrati.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessun percorso trovato.</p>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto flex flex-col">
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
                  </div>
                )}
              </Panel>

              {/* Ciclovie 2020 — terza fonte, aggiunta il 28/08/2026, dato
                  storico fermo al 2020 (vedi disclaimer sopra) — riquadro a
                  sé come Regione, subito prima della Mappa. */}
              <Panel title={`Ciclovie 2020 · storico (${percorsiCiclovie2020Filtrati.length})`} span={2}>
                {!datiCiclovie2020 ? (
                  <p className="text-ink-faint text-sm font-mono">Dati non ancora disponibili.</p>
                ) : percorsiCiclovie2020Filtrati.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessun percorso trovato.</p>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto flex flex-col">
                    {percorsiCiclovie2020Filtrati.map((p, i) => {
                      const chiave = `ciclovie2020:${p.nome}`;
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
                            {p.livelli.length > 0 && (
                              <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                                {p.livelli.join(", ")}
                              </span>
                            )}
                          </div>
                          {/* Lunghezza aggregata per stato — un percorso può
                              avere tratti in stati diversi (es. parte
                              "realizzato", parte "in progetto"), mai
                              ridotto a un solo stato scelto a caso. */}
                          <div className="text-ink-dim text-xs mt-0.5">
                            {p.lunghezzaPerStato.length > 0
                              ? p.lunghezzaPerStato
                                  .map((ls) => `${formattaLunghezza(ls.metri)} ${ls.stato}`)
                                  .join(" · ")
                              : "Lunghezza non disponibile"}
                            {p.lunghezzaParziale ? " (parziale)" : ""}
                          </div>
                          {p.segmenti.length > 1 && (
                            <div className="font-mono text-[10px] text-ink-dim mt-1">{p.segmenti.length} tratti</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title="Mappa" span={2}>
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
                  aria-label="Mappa dei percorsi ciclabili in Friuli Venezia Giulia — elenco testuale equivalente nei riquadri qui sopra. Cliccare un percorso nell'elenco per evidenziarlo qui."
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
