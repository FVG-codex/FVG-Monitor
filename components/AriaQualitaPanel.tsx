"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type DatoProvincia = {
  stazione: string;
  dati_insufficienti: boolean;
  [campo: string]: unknown; // il nome del campo valore varia per inquinante
};

type SnapshotInquinante = {
  data_misura: string;
  per_provincia: Partial<Record<ProvinciaSlug, DatoProvincia>>;
  [sogliaKey: string]: unknown;
};

type Inquinante = {
  key: string;
  label: string;
  snapshotId: string;
  campoValore: string;
  campoSuperamento: string;
  campoSoglia: string;
  noteTipo: string; // es. "media giornaliera", "media oraria max"
};

const INQUINANTI: Inquinante[] = [
  { key: "pm10", label: "PM10", snapshotId: "aria:pm10", campoValore: "media_giornaliera", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3", noteTipo: "media giornaliera" },
  { key: "pm25", label: "PM2.5", snapshotId: "aria:pm25", campoValore: "media_giornaliera", campoSuperamento: "superamento_oms", campoSoglia: "soglia_oms_ugm3", noteTipo: "media giornaliera · linea guida OMS 24h (l'Italia ha solo limite annuale)" },
  { key: "ozono", label: "Ozono", snapshotId: "aria:ozono", campoValore: "media_mobile_8h_max", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3", noteTipo: "media mobile 8h max" },
  { key: "no2", label: "NO2", snapshotId: "aria:no2", campoValore: "media_oraria_max", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3", noteTipo: "media oraria max" },
];

function formattaData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function AriaQualitaPanel() {
  const [datiPerInquinante, setDatiPerInquinante] = useState<Partial<Record<string, SnapshotInquinante>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<string>("pm10");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const ids = INQUINANTI.map((i) => i.snapshotId);
      const { data, error } = await supabase.from("snapshots").select("id, data").in("id", ids);
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      const mappa: Partial<Record<string, SnapshotInquinante>> = {};
      for (const row of data) {
        const key = INQUINANTI.find((i) => i.snapshotId === row.id)?.key;
        if (key) mappa[key] = row.data as SnapshotInquinante;
      }
      setDatiPerInquinante(mappa);
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
    return <p className="text-ink-faint text-sm font-mono">Caricamento qualità aria…</p>;
  }
  if (stato === "error") {
    return <p className="text-ink-faint text-sm font-mono">Dati qualità aria non disponibili al momento.</p>;
  }

  const attivo = INQUINANTI.find((i) => i.key === tab)!;
  const dati = datiPerInquinante[tab];

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {INQUINANTI.map((i) => (
          <button
            key={i.key}
            onClick={() => setTab(i.key)}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              tab === i.key ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      {!dati ? (
        <p className="text-ink-faint text-sm font-mono">Dati {attivo.label} non disponibili al momento.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PROVINCE_LIST.map((p) => {
              const d = dati.per_provincia[p.slug];
              const valore = d ? (d[attivo.campoValore] as number | null) : null;
              const superamento = d ? (d[attivo.campoSuperamento] as boolean | null) : null;
              return (
                <div key={p.slug} className="flex-1 min-w-[72px] border border-line rounded p-2 text-center">
                  <div className="font-cond font-semibold text-xs mb-1">{p.nome}</div>
                  {valore !== null && valore !== undefined ? (
                    <>
                      <div
                        className={`font-mono font-bold text-lg ${
                          superamento ? "text-allerta-rossa" : "text-allerta-verde"
                        }`}
                      >
                        {valore}
                      </div>
                      <div className="font-mono text-[9px] text-ink-faint">µg/m³</div>
                    </>
                  ) : (
                    <div className="font-mono text-xs text-ink-faint">n.d.</div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-ink-faint text-[10px] font-mono">
            {attivo.label}, {attivo.noteTipo} del {formattaData(dati.data_misura)} — soglia{" "}
            {dati[attivo.campoSoglia] as number} µg/m³ · fonte: ARPA FVG
          </p>
        </>
      )}
    </div>
  );
}
