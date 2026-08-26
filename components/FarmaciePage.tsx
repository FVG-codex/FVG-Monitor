"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import type { FarmaciaTurno } from "@/components/FarmacieMap";

const FarmacieMap = dynamic(() => import("@/components/FarmacieMap").then((m) => m.FarmacieMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

type FarmacieProvincia = { totale: number; farmacie: FarmaciaTurno[] };
type SnapshotFarmacie = { data: string; per_provincia: Partial<Record<ProvinciaSlug, FarmacieProvincia>> };

function formattaData(iso: string): string {
  // iso è "YYYY-MM-DD" (data pura, senza ora) — new Date() la interpreta
  // come UTC mezzanotte, corretto per una data senza componente oraria.
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function orario(iso: string): string {
  return iso.slice(11, 16);
}

function formattaTurno(t: { da: string; a: string | null }): string {
  const giornoDa = t.da.slice(0, 10);
  const finisceDomani = t.a && t.a.slice(0, 10) !== giornoDa;
  return `${orario(t.da)} – ${t.a ? orario(t.a) : "?"}${finisceDomani ? " (giorno succ.)" : ""}`;
}

export function FarmaciePage() {
  const [dati, setDati] = useState<SnapshotFarmacie | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");

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

  const provincia = dati?.per_provincia[tab];
  const farmacie = provincia?.farmacie ?? [];
  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const centroProvincia: Record<ProvinciaSlug, [number, number]> = {
    trieste: [45.65, 13.78],
    udine: [46.06, 13.24],
    gorizia: [45.94, 13.62],
    pordenone: [45.96, 12.66],
  };

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Farmacie di turno</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Farmacie con apertura straordinaria (turno) oggi
          {dati ? ` — ${formattaData(dati.data)}` : ""} in Friuli Venezia Giulia — fonte: Regione Autonoma FVG
          (dati.friuliveneziagiulia.it), aggiornato ogni giorno alle 01:00. Non include l&apos;orario ordinario
          delle farmacie, solo le aperture straordinarie di oggi.
        </p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento farmacie di turno…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati farmacie di turno non disponibili al momento.</p>
        )}

        {stato === "ready" && dati && (
          <>
            <div className="flex gap-1.5 flex-wrap mb-6">
              {PROVINCE_LIST.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setTab(p.slug)}
                  aria-pressed={tab === p.slug}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    tab === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {p.nome} ({dati.per_provincia[p.slug]?.totale ?? 0})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title="Mappa">
                <div
                  role="region"
                  aria-label={`Mappa delle farmacie di turno in provincia di ${nomeProvincia} — elenco testuale equivalente nel pannello a fianco`}
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <FarmacieMap farmacie={farmacie} centro={centroProvincia[tab]} />
                </div>
              </Panel>

              <Panel title={`Elenco (${farmacie.length})`}>
                {farmacie.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    Nessuna farmacia di turno oggi in provincia di {nomeProvincia}.
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {farmacie.map((f, i) => (
                      <div key={`${f.nome}-${i}`} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="text-sm font-semibold">{f.nome}</div>
                        <div className="text-ink-dim text-xs mt-0.5">
                          {f.indirizzo}
                          {f.indirizzo && f.comune ? ", " : ""}
                          {f.comune}
                        </div>
                        {f.telefono && <div className="text-ink-faint text-xs mt-0.5">Tel. {f.telefono}</div>}
                        <div className="font-mono text-[10px] text-ink-dim mt-1">
                          {f.turni.map((t, ti) => (
                            <div key={ti}>Turno {formattaTurno(t)}</div>
                          ))}
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
