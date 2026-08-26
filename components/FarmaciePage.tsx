"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { type SnapshotFarmacie, diTurnoOggi, formattaFascia, statoApertura, adessoEuropeRome } from "@/lib/farmacie";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

const FarmacieMap = dynamic(() => import("@/components/FarmacieMap").then((m) => m.FarmacieMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

function formattaData(iso: string): string {
  // iso è "YYYY-MM-DD" (data pura, senza ora) — new Date() la interpreta
  // come UTC mezzanotte, corretto per una data senza componente oraria.
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// Un solo componente per entrambe le pagine (/farmacie-tutte e
// /farmacie-di-turno), stessa snapshot Supabase filtrata client-side —
// vedi nota in lib/farmacie.ts. `soloTurno` cambia solo QUALI farmacie
// compaiono, non come vengono mostrate: ogni farmacia elenca comunque
// tutte le proprie fasce di oggi (normali + turno), etichettate.
export function FarmaciePage({ soloTurno }: { soloTurno: boolean }) {
  const [dati, setDati] = useState<SnapshotFarmacie | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  // Comune selezionato dentro la provincia corrente — `null` = "Tutti i
  // comuni" (26/08/2026, richiesto dall'utente: un secondo livello di
  // tastini, stessa grafica di quelli provincia, per filtrare per
  // comune dopo aver scelto la provincia). Resettato ad ogni cambio
  // provincia — vedi selezionaProvincia() sotto — perché l'elenco comuni
  // è specifico della provincia.
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }
  // "Aperta ora"/"Chiusa ora" (26/08/2026): calcolato lato client, non
  // dalla snapshot (che si aggiorna ogni 15 min ma contiene solo gli
  // orari, non uno stato aperto/chiuso). Aggiornato ogni 30 secondi,
  // indipendente dal polling dati sopra — vedi statoApertura() in
  // lib/farmacie.ts per il perché del fuso Europe/Rome esplicito.
  const [adesso, setAdesso] = useState(() => adessoEuropeRome());

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "farmacie").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotFarmacie);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAdesso(adessoEuropeRome()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const provincia = dati?.per_provincia[tab];
  const tutteLaProvincia = provincia?.farmacie ?? [];

  // Farmacie della provincia corrente, filtrate solo per soloTurno (non
  // ancora per comune/ricerca) — è la base sia dell'elenco comuni sotto
  // sia del filtro finale, e il suo conteggio è quello mostrato da
  // "Tutti i comuni".
  const baseProvincia = useMemo(
    () => (soloTurno ? tutteLaProvincia.filter(diTurnoOggi) : tutteLaProvincia),
    [tutteLaProvincia, soloTurno]
  );

  // Comuni presenti nella provincia corrente, con conteggio, in ordine
  // alfabetico — calcolato su baseProvincia (non su farmacie già
  // filtrate da ricerca/comune) così i tastini restano stabili mentre si
  // digita nella ricerca, stesso principio dei conteggi provincia sopra.
  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const f of baseProvincia) {
      const c = f.comune ?? "Comune non specificato";
      conteggio.set(c, (conteggio.get(c) ?? 0) + 1);
    }
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [baseProvincia]);

  const farmacie = useMemo(() => {
    let lista = baseProvincia;
    if (comuneSel) lista = lista.filter((f) => (f.comune ?? "Comune non specificato") === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) lista = lista.filter((f) => f.nome.toLowerCase().includes(q) || (f.comune ?? "").toLowerCase().includes(q));
    return lista;
  }, [baseProvincia, comuneSel, ricerca]);

  // Conteggio per i tab provincia: coerente col filtro soloTurno, non il
  // totale grezzo della snapshot (altrimenti "Trieste (94)" nella pagina
  // Turno mostrerebbe il totale di TUTTE le farmacie di Trieste, non
  // solo quelle di turno oggi).
  function conteggioProvincia(p: ProvinciaSlug): number {
    const lista = dati?.per_provincia[p]?.farmacie ?? [];
    return soloTurno ? lista.filter(diTurnoOggi).length : lista.length;
  }

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const centroProvincia: Record<ProvinciaSlug, [number, number]> = {
    trieste: [45.65, 13.78],
    udine: [46.06, 13.24],
    gorizia: [45.94, 13.62],
    pordenone: [45.96, 12.66],
  };

  const titolo = soloTurno ? "Farmacie di turno" : "Tutte le farmacie";
  const descrizione = soloTurno
    ? "Farmacie con apertura straordinaria (turno) oggi"
    : "Elenco completo delle farmacie";

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{titolo}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {descrizione}
          {dati ? ` — ${formattaData(dati.data)}` : ""} in Friuli Venezia Giulia — fonte: Regione Autonoma FVG
          (dati.friuliveneziagiulia.it), aggiornato ogni giorno alle 01:00.{" "}
          {soloTurno
            ? "Non include l'orario ordinario delle farmacie, solo le aperture straordinarie di oggi."
            : "Gli orari mostrati sono quelli di oggi (normali ed eventuali turni straordinari) — la fonte non pubblica un orario settimanale fisso, solo un aggiornamento giornaliero."}
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento farmacie…</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">Dati farmacie non disponibili al momento.</p>}

        {stato === "ready" && dati && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => selezionaProvincia(p.slug)}
                  aria-pressed={tab === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    tab === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({conteggioProvincia(p.slug)})
                </button>
              ))}
            </div>

            {comuni.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setComuneSel(null)}
                  aria-pressed={comuneSel === null}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    comuneSel === null ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  Tutti i comuni ({baseProvincia.length})
                </button>
                {comuni.map(([c, n]) => (
                  <button
                    key={c}
                    onClick={() => setComuneSel(c)}
                    aria-pressed={comuneSel === c}
                    className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                      comuneSel === c ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                    }`}
                  >
                    {c} ({n})
                  </button>
                ))}
              </div>
            )}

            <label className="block mb-4">
              <span className="sr-only">Cerca per nome o comune</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca per nome o comune…"
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title="Mappa">
                <div
                  role="region"
                  aria-label={`Mappa delle farmacie${comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`} — elenco testuale equivalente nel pannello a fianco`}
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <FarmacieMap farmacie={farmacie} centro={centroProvincia[tab]} adesso={adesso} />
                </div>
              </Panel>

              <Panel title={`Elenco (${farmacie.length})`}>
                {farmacie.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    {soloTurno
                      ? `Nessuna farmacia di turno oggi${comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`}.`
                      : `Nessuna farmacia trovata${comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`}.`}
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {farmacie.map((f, i) => (
                      <div key={`${f.nome}-${i}`} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{f.nome}</span>
                          <StatoApertoBadge stato={statoApertura(f, adesso)} />
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5">
                          {f.indirizzo}
                          {f.indirizzo && f.comune ? ", " : ""}
                          {f.comune}
                        </div>
                        {f.telefono && <div className="text-ink-faint text-xs mt-0.5">Tel. {f.telefono}</div>}
                        <div className="font-mono text-[10px] text-ink-dim mt-1">
                          {f.orariOggi.length === 0 ? (
                            <div>Orario non disponibile</div>
                          ) : (
                            f.orariOggi.map((o, oi) => <div key={oi}>{formattaFascia(o)}</div>)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
