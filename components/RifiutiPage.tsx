"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import {
  type SnapshotRifiuti,
  type ComuneRifiuti,
  ETICHETTA_TIPO,
  COLORE_TIPO,
  formattaDataRifiuti,
  prossimeRaccolte,
} from "@/lib/rifiuti";

// Ambiente → Servizi → Rifiuti (17/09/2026, richiesto dall'utente). Vedi
// il commento esteso sopra ingestRifiuti() in scripts/ingest-light.mjs
// per fonte (Isontina Ambiente, Isontino/Carso), metodo di verifica con
// HTML reale e i limiti noti: solo i 28 comuni serviti da Isontina
// Ambiente (non tutta la regione), calendario "solo comune" — quando un
// comune ha più aree al suo interno (es. Gorizia, 6 aree) qui sotto
// compare un piccolo selettore di area, non una ricerca per via.

function oggiIsoLocale(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

export function RifiutiPage() {
  const [dati, setDati] = useState<SnapshotRifiuti | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [comuneSlug, setComuneSlug] = useState<string>("");
  const [areaIndice, setAreaIndice] = useState(0);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "rifiuti:isontina")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const snapshot = data.data as SnapshotRifiuti;
      setDati(snapshot);
      setStato("ready");
      if (snapshot.comuni.length > 0) {
        setComuneSlug((prev) => prev || snapshot.comuni[0].slug);
      }
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const comune: ComuneRifiuti | undefined = useMemo(
    () => dati?.comuni.find((c) => c.slug === comuneSlug),
    [dati, comuneSlug]
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
          Calendario porta a porta, centro di raccolta e campane del vetro — fonte: Isontina Ambiente. Copre i 28
          comuni serviti (Isontino e parte del Carso), non tutta la regione.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati raccolta rifiuti non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
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
                {dati.comuni.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nome}
                  </option>
                ))}
              </select>
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
                <Panel title="Prossime raccolte">
                  {prossime.length === 0 ? (
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
                              {ETICHETTA_TIPO[t]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel title="Centro di raccolta e vetro">
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
                </Panel>
              </div>
            )}

            <p className="text-ink-faint text-[10px] font-mono mt-6 border-t border-line pt-3">
              Aggiornato al {new Date(dati.aggiornato_al).toLocaleString("it-IT")} — il calendario ufficiale ha
              sempre la precedenza su questa pagina: verificare su isontinambiente.it in caso di dubbio, specie in
              prossimità di festività.
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
