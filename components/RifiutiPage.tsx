"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { RifiutiTriesteCalendario } from "@/components/RifiutiTriesteCalendario";
import { supabase } from "@/lib/supabase";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  type SnapshotRifiuti,
  type ComuneRifiuti,
  etichettaTipo,
  COLORE_TIPO,
  GIORNI_SETTIMANA_BREVE,
  PROVINCE_RIFIUTI_ATTIVE,
  formattaDataRifiuti,
  prossimeRaccolte,
  comuniPerProvincia,
  provinceConDati,
} from "@/lib/rifiuti";

// Ambiente → Servizi → Rifiuti (17/09/2026, richiesto dall'utente).
// Riorganizzata per provincia il 18/09/2026, stesso giorno in cui sono
// arrivati un secondo gestore (A&T 2000, provincia di Udine) e un terzo
// (GEA, provincia di Pordenone). Vedi il commento esteso sopra
// ingestRifiuti()/rifiutiIngestAet2000()/RIFIUTI_COMUNI_GEA in
// scripts/ingest-light.mjs per fonti, metodo di verifica/trascrizione e
// i limiti noti: Gorizia e i comuni minori di Trieste sono coperti per
// intero (28 comuni, Isontina Ambiente), Udine solo parzialmente (2
// comuni su ~80, A&T 2000 — San Daniele del Friuli e Tolmezzo, gli
// unici di cui si è vista HTML reale finora), Pordenone anch'essa
// parzialmente (2 comuni su una ventina serviti da GEA — Aviano e
// Pordenone, gli unici di cui si sono visti i PDF reali; a differenza
// degli altri due gestori il dato GEA è statico, trascritto a mano dai
// calendari PDF annuali). Calendario "solo comune" — quando un comune
// ha più aree al suo interno (es. Gorizia, 6 aree; Tolmezzo, 2 zone
// Nord/Sud; Pordenone stesso, 6 zone Blu/Gialla/Rossa/Marrone/Verde
// Nord/Verde Sud) qui sotto compare un piccolo selettore di area, non
// una ricerca per via/indirizzo. Le tab provincia seguono lo stesso
// pattern già usato in NotizieProvinciaPage.tsx: tutte e 4 visibili,
// quelle non ancora coperte mostrano un messaggio "in arrivo" invece di
// restare disabilitate.
//
// Quarto gestore aggiunto lo stesso giorno: AcegasApsAmga (Trieste
// città, via Il Rifiutologo/webapp-ambiente.gruppohera.it — v. commento
// esteso sopra rifiutiIngestAcegas() in scripts/ingest-light.mjs).
// Copre per ora solo i punti di raccolta fissi: `aree` resta sempre []
// e `centro_raccolta` null per questo comune — il pannello destro
// mostra invece l'elenco `stazioni_ecologiche` quando presente. Trieste
// ha in realtà anche un calendario porta a porta per indirizzo/civico
// (scoperta corretta lo stesso giorno, v. commento sopra
// rifiutiIngestAcegas() in scripts/ingest-light.mjs), non ancora
// implementato perché richiede un vero flusso di ricerca indirizzo
// (v. sotto), non il blocco singolo centro/campane usato dagli altri
// gestori.

function oggiIsoLocale(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

export function RifiutiPage() {
  const [dati, setDati] = useState<SnapshotRifiuti | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [provincia, setProvincia] = useState<ProvinciaSlug>("gorizia");
  const [comuneSlug, setComuneSlug] = useState<string>("");
  const [areaIndice, setAreaIndice] = useState(0);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "rifiuti")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const snapshot = data.data as SnapshotRifiuti;
      setDati(snapshot);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const gruppi = useMemo(() => comuniPerProvincia(dati?.comuni ?? []), [dati]);
  const provinceAttive = useMemo(
    () => (dati ? provinceConDati(dati.comuni) : PROVINCE_RIFIUTI_ATTIVE),
    [dati]
  );
  const comuniProvincia = gruppi.get(provincia) ?? [];

  // Se la provincia selezionata non ha (ancora) comuni nello snapshot,
  // o il comune scelto non appartiene più a quella provincia (es. dopo
  // un cambio di tab), si riallinea sul primo comune disponibile.
  useEffect(() => {
    if (comuniProvincia.length === 0) return;
    if (!comuniProvincia.some((c) => c.slug === comuneSlug)) {
      setComuneSlug(comuniProvincia[0].slug);
      setAreaIndice(0);
    }
  }, [provincia, comuniProvincia, comuneSlug]);

  const comune: ComuneRifiuti | undefined = useMemo(
    () => comuniProvincia.find((c) => c.slug === comuneSlug),
    [comuniProvincia, comuneSlug]
  );

  const areaCorrente = comune?.aree[areaIndice] ?? comune?.aree[0];
  const oggiIso = oggiIsoLocale();
  const prossime = prossimeRaccolte(areaCorrente, oggiIso, 8);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/servizi" className="text-cool-ink text-xs font-mono hover:underline">
          ← Servizi
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          Raccolta differenziata
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Calendario porta a porta, centro di raccolta e campane del vetro, divisi per provincia. Copre solo i
          comuni serviti dai gestori già integrati, non tutta la regione — vedi sotto per la provincia selezionata.
        </p>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setProvincia(p.slug)}
              aria-pressed={provincia === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                provincia === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati raccolta rifiuti non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && !provinceAttive.includes(provincia) && (
          <p className="text-ink-faint text-sm font-mono">
            Raccolta differenziata per la provincia di {PROVINCE[provincia].nome} in arrivo in una prossima fase.
          </p>
        )}

        {stato === "ready" && dati && provinceAttive.includes(provincia) && (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <label htmlFor="rifiuti-comune" className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                Comune
              </label>
              <select
                id="rifiuti-comune"
                value={comuneSlug}
                onChange={(e) => {
                  setComuneSlug(e.target.value);
                  setAreaIndice(0);
                }}
                className="border border-line rounded px-2 py-1.5 text-sm font-mono bg-panel text-ink"
              >
                {comuniProvincia.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {comune && <span className="text-ink-faint text-[10px] font-mono">Gestore: {comune.gestore}</span>}
            </div>

            {comune && comune.stale && (
              <p className="text-allerta-arancione-ink text-[10px] font-mono uppercase mb-3">
                Dato non aggiornato dall&apos;ultima verifica (errore di rete alla fonte)
              </p>
            )}

            {comune && comune.aree.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <span className="text-ink-faint text-xs font-mono uppercase tracking-wide mr-1">Area</span>
                {comune.aree.map((a, i) => (
                  <button
                    key={`${a.area ?? "?"}-${i}`}
                    onClick={() => setAreaIndice(i)}
                    aria-pressed={areaIndice === i}
                    className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                      areaIndice === i ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                    }`}
                  >
                    {a.area ? `Area ${a.area}` : "n/d"}
                  </button>
                ))}
              </div>
            )}

            {comune && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
                <Panel title={comune.gestore === "AcegasApsAmga" ? "Calendario porta a porta" : "Prossime raccolte"}>
                  {comune.gestore === "AcegasApsAmga" ? (
                    <RifiutiTriesteCalendario />
                  ) : prossime.length === 0 ? (
                    <p className="text-ink-faint text-sm font-mono">
                      Nessun dato di calendario disponibile per quest&apos;area al momento.
                    </p>
                  ) : (
                    prossime.map((g, i) => (
                      <div
                        key={g.data}
                        className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}
                      >
                        <div className="font-mono text-ink-dim text-xs w-24 flex-shrink-0 uppercase">
                          {g.data === oggiIso ? "Oggi" : formattaDataRifiuti(g.data)}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {g.tipi.map((t) => (
                            <span key={t} className="flex items-center gap-1.5 text-sm">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORE_TIPO[t] }}
                              />
                              {etichettaTipo(t, comune.gestore)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel
                  title={
                    comune.stazioni_ecologiche && comune.stazioni_ecologiche.length > 0
                      ? "Stazioni ecologiche"
                      : "Centro di raccolta e vetro"
                  }
                >
                  {comune.stazioni_ecologiche && comune.stazioni_ecologiche.length > 0 ? (
                    <div className="space-y-4">
                      {comune.stazioni_ecologiche.map((s, i) => (
                        <div key={s.id} className={i > 0 ? "border-t border-line pt-3" : ""}>
                          <div className="font-cond font-semibold text-sm uppercase tracking-wide mb-1">
                            {s.nome}
                          </div>
                          {s.indirizzo && (
                            <div className="text-ink text-sm mb-1">
                              {s.indirizzo}
                              {s.comune ? ` — ${s.comune}` : ""}
                            </div>
                          )}
                          {s.orari.length > 0 && (
                            <div className="text-ink-dim text-xs mb-2">
                              {s.orari.map((o, oi) => (
                                <span key={oi} className="mr-2 whitespace-nowrap">
                                  {GIORNI_SETTIMANA_BREVE[o.giorno] ?? o.giorno} {o.orarioInizio}–{o.orarioFine}
                                </span>
                              ))}
                            </div>
                          )}
                          {s.materiali.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {s.materiali.map((m) => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-panel-alt text-ink-dim"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {comune.centro_raccolta ? (
                        <div className="mb-4">
                          <div className="font-cond font-semibold text-sm uppercase tracking-wide mb-1">
                            Conferimenti ingombranti e verde
                          </div>
                          {comune.centro_raccolta.indirizzo && (
                            <div className="text-ink text-sm mb-1">{comune.centro_raccolta.indirizzo}</div>
                          )}
                          {comune.centro_raccolta.apertura && (
                            <div className="text-ink-dim text-xs mb-2">{comune.centro_raccolta.apertura}</div>
                          )}
                          {comune.centro_raccolta.materiali.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {comune.centro_raccolta.materiali.map((m) => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-panel-alt text-ink-dim"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-ink-faint text-sm font-mono mb-4">
                          Info centro di raccolta non disponibili per questo comune.
                        </p>
                      )}

                      {comune.campane_vetro.length > 0 && (
                        <div>
                          <div className="font-cond font-semibold text-sm uppercase tracking-wide mb-1">
                            Campane del vetro
                          </div>
                          <ul className="text-ink-dim text-xs space-y-1 list-disc list-inside">
                            {comune.campane_vetro.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </Panel>
              </div>
            )}

            <p className="text-ink-faint text-[10px] font-mono mt-6 border-t border-line pt-3">
              Aggiornato al {new Date(dati.aggiornato_al).toLocaleString("it-IT")} — il calendario ufficiale del
              gestore ha sempre la precedenza su questa pagina: verificare in caso di dubbio, specie in prossimità
              di festività.
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
