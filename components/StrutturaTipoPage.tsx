"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  TIPI_STRUTTURA,
  PROVINCIA_ABBR,
  type TipoStrutturaSlug,
  type SnapshotStruttureRicettive,
} from "@/lib/struttureRicettive";

export function StrutturaTipoPage({ tipo }: { tipo: TipoStrutturaSlug }) {
  const info = TIPI_STRUTTURA[tipo];
  const [dati, setDati] = useState<SnapshotStruttureRicettive | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [provincia, setProvincia] = useState<ProvinciaSlug | "tutte">("tutte");
  const [ricerca, setRicerca] = useState("");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "strutture-ricettive").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotStruttureRicettive);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const datiTipo = dati?.tipi[tipo];

  // min-w-0 sul contenitore flex della riga sotto (lezione permanente
  // Fase 4 — Responsive): qui non serve, nessun elemento è troncato con
  // `truncate`, ma la struttura della riga segue lo stesso schema di
  // AviazionePage per coerenza visiva.
  const elenco = useMemo(() => {
    if (!datiTipo) return [];
    const province: ProvinciaSlug[] = provincia === "tutte" ? PROVINCE_LIST.map((p) => p.slug) : [provincia];
    const voci = province.flatMap((p) => (datiTipo.per_provincia[p] ?? []).map((v) => ({ ...v, provincia: p })));
    const q = ricerca.trim().toLowerCase();
    const filtrate = q
      ? voci.filter((v) => v.nome.toLowerCase().includes(q) || (v.comune ?? "").toLowerCase().includes(q))
      : voci;
    return filtrate.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [datiTipo, provincia, ricerca]);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <Link href="/strutture-ricettive" className="text-cool text-xs font-mono hover:underline">
          ← Strutture ricettive
        </Link>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{info.nome}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {info.descrizione} — fonte: Regione Autonoma FVG (dati.friuliveneziagiulia.it). Elenco senza indirizzo,
          telefono o coordinate: la fonte pubblica solo denominazione, comune, email e sito quando disponibili.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>}

        {stato === "ready" && dati && datiTipo && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setProvincia("tutte")}
                aria-pressed={provincia === "tutte"}
                className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                  provincia === "tutte" ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                Tutte ({datiTipo.totale})
              </button>
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setProvincia(p.slug)}
                  aria-pressed={provincia === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    provincia === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({(datiTipo.per_provincia[p.slug] ?? []).length})
                </button>
              ))}
            </div>

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

            <div className="grid grid-cols-1 gap-px bg-line border border-line">
              <Panel title={`Elenco (${elenco.length})`}>
                {elenco.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">Nessuna struttura trovata.</p>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto flex flex-col">
                    {elenco.map((v, i) => (
                      <div key={`${v.nome}-${i}`} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{v.nome}</span>
                          <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                            {PROVINCIA_ABBR[v.provincia]}
                          </span>
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5">{v.comune}</div>
                        {(v.sito || v.email) && (
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {v.sito && (
                              <a
                                href={v.sito}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-cool hover:underline inline-block"
                              >
                                Sito →<span className="sr-only"> (si apre in una nuova scheda)</span>
                              </a>
                            )}
                            {v.email && (
                              <a
                                href={`mailto:${v.email}`}
                                className="font-mono text-[10px] text-ink-faint hover:text-cool"
                              >
                                {v.email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <p className="text-ink-faint text-[10px] font-mono mt-3">
              Dati aggiornati al{" "}
              {new Date(dati.aggiornato_al).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
