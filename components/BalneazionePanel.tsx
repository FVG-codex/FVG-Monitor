"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type PuntoSfavorevole = { nome: string; enterococchi: number | null; ecoli: number | null; data: string };

type BalneazioneProvincia = {
  totale: number;
  favorevoli: number;
  sfavorevoli: number;
  nd: number;
  punti_sfavorevoli: PuntoSfavorevole[];
  aggiornato_al: string;
};

type SnapshotBalneazione = {
  per_provincia: Partial<Record<ProvinciaSlug, BalneazioneProvincia>>;
};

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function BalneazionePanel() {
  const [dati, setDati] = useState<SnapshotBalneazione | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "balneazione").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotBalneazione);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento qualità acque…</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">Dati qualità acque non disponibili al momento.</p>;
  }

  const provincia = dati.per_provincia[tab];
  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;

  return (
    <div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {PROVINCE_LIST.map((p) => (
          <button
            key={p.slug}
            onClick={() => setTab(p.slug)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              tab === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {p.nome}
          </button>
        ))}
      </div>

      {!provincia ? (
        <p className="text-ink-faint text-sm font-mono">
          Nessun punto di monitoraggio trovato in provincia di {nomeProvincia}.
        </p>
      ) : (
        <>
          <div className="flex gap-6 mb-3">
            <div>
              <div className="font-cond font-bold text-[36px] leading-[0.9] text-allerta-verde">
                {provincia.favorevoli}
              </div>
              <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">Favorevoli</div>
            </div>
            <div>
              <div
                className={`font-cond font-bold text-[36px] leading-[0.9] ${
                  provincia.sfavorevoli > 0 ? "text-allerta-rossa" : "text-ink-dim"
                }`}
              >
                {provincia.sfavorevoli}
              </div>
              <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">Sfavorevoli</div>
            </div>
            <div>
              <div className="font-cond font-bold text-[36px] leading-[0.9] text-ink-dim">{provincia.totale}</div>
              <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">Punti monitorati</div>
            </div>
          </div>

          {provincia.punti_sfavorevoli.length > 0 && (
            <div className="mb-3">
              {provincia.punti_sfavorevoli.map((pt) => (
                <div key={pt.nome} className="flex items-center gap-2 py-1.5 text-sm border-t border-line first:border-t-0">
                  <span className="w-2 h-2 rounded-full bg-allerta-rossa flex-shrink-0" />
                  <span className="text-ink-dim flex-1">{pt.nome}</span>
                  <span className="font-mono text-[10px] text-ink-faint">{formattaData(pt.data)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between font-mono text-[11px] text-ink-faint border-t border-line pt-3">
            <span>Ultimo prelievo per punto, esito singolo campione</span>
            <span>{formattaData(provincia.aggiornato_al)}</span>
          </div>
          <p className="text-ink-faint text-[10px] font-mono mt-2">
            Fonte: ARPA FVG · soglie D.Lgs 116/2008 (indicativo, non sostituisce eventuali ordinanze comunali)
          </p>
        </>
      )}
    </div>
  );
}
