"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { intlLocale } from "@/lib/intlLocale";

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
  snapshotId: string;
  campoValore: string;
  campoSuperamento: string;
  campoSoglia: string;
};

// `label`/`noteTipo` (05/10/2026): tradotti, non più qui — vedi
// `qualitaAria.inquinanti.<key>.label`/`.noteTipo` in messages/*.json,
// recuperati sotto con `t(\`inquinanti.${i.key}.label\`)` (stesso
// schema già usato per `CommercioPage.tsx`/`SanitaPage.tsx`: l'array a
// livello di modulo perde i campi testo a favore di una `key` stabile).
const INQUINANTI: Inquinante[] = [
  { key: "pm10", snapshotId: "aria:pm10", campoValore: "media_giornaliera", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3" },
  { key: "pm25", snapshotId: "aria:pm25", campoValore: "media_giornaliera", campoSuperamento: "superamento_oms", campoSoglia: "soglia_oms_ugm3" },
  { key: "ozono", snapshotId: "aria:ozono", campoValore: "media_mobile_8h_max", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3" },
  { key: "no2", snapshotId: "aria:no2", campoValore: "media_oraria_max", campoSuperamento: "superamento", campoSoglia: "soglia_ugm3" },
];

function formattaData(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
}

// provincia opzionale (11/09/2026, per la nuova pagina "Dati ambientali"
// sotto Ambiente): quando assente il comportamento è quello di sempre
// (griglia con tutte e 4 le province, usata in homepage), quando
// presente mostra un solo valore più grande per quella provincia —
// stesso principio già usato per VentoPanel/PioggiaPanel/FiumePanel.
export function AriaQualitaPanel({ provincia }: { provincia?: ProvinciaSlug } = {}) {
  const [datiPerInquinante, setDatiPerInquinante] = useState<Partial<Record<string, SnapshotInquinante>>>({});
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<string>("pm10");
  const t = useTranslations("qualitaAria");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

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
    return <p className="text-ink-faint text-sm font-mono">{t("caricamento")}</p>;
  }
  if (stato === "error") {
    return <p className="text-ink-faint text-sm font-mono">{t("datiNonDisponibili")}</p>;
  }

  const attivo = INQUINANTI.find((i) => i.key === tab)!;
  const attivoLabel = t(`inquinanti.${attivo.key}.label`);
  const dati = datiPerInquinante[tab];

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {INQUINANTI.map((i) => (
          <button
            key={i.key}
            onClick={() => setTab(i.key)}
            aria-pressed={tab === i.key}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              tab === i.key ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t(`inquinanti.${i.key}.label`)}
          </button>
        ))}
      </div>

      {!dati ? (
        <p className="text-ink-faint text-sm font-mono">{t("datiInquinanteNonDisponibili", { inquinante: attivoLabel })}</p>
      ) : provincia ? (
        (() => {
          const d = dati.per_provincia[provincia];
          const valore = d ? (d[attivo.campoValore] as number | null) : null;
          const superamento = d ? (d[attivo.campoSuperamento] as boolean | null) : null;
          return (
            <>
              {valore !== null && valore !== undefined ? (
                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-cond font-bold text-[52px] leading-[0.9] ${
                        superamento ? "text-allerta-rossa-ink" : ""
                      }`}
                    >
                      {valore}
                    </span>
                    <span className="text-ink-dim text-sm">µg/m³</span>
                  </div>
                  {superamento && (
                    <div className="font-mono text-[10px] text-allerta-rossa-ink uppercase mt-1">{t("oltreSoglia")}</div>
                  )}
                </div>
              ) : (
                <p className="text-ink-faint text-sm font-mono mb-3">{t("datoNonDisponibileStazione")}</p>
              )}
              <p className="text-ink-faint text-[10px] font-mono">
                {t("captionTab", {
                  label: attivoLabel,
                  noteTipo: t(`inquinanti.${attivo.key}.noteTipo`),
                  data: formattaData(dati.data_misura, locale),
                  soglia: dati[attivo.campoSoglia] as number,
                })}
              </p>
            </>
          );
        })()
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
                          superamento ? "text-allerta-rossa-ink" : "text-allerta-verde-ink"
                        }`}
                      >
                        {valore}
                      </div>
                      <div className="font-mono text-[9px] text-ink-faint">µg/m³</div>
                      {/* Testo, non solo colore — vedi stessa nota in
                          No2Panel.tsx (WCAG 1.4.1). */}
                      {superamento && (
                        <div className="font-mono text-[8px] text-allerta-rossa-ink uppercase mt-0.5">{t("oltreSoglia")}</div>
                      )}
                    </>
                  ) : (
                    <div className="font-mono text-xs text-ink-faint">{tChrome("nd")}</div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-ink-faint text-[10px] font-mono">
            {t("captionTab", {
              label: attivoLabel,
              noteTipo: t(`inquinanti.${attivo.key}.noteTipo`),
              data: formattaData(dati.data_misura, locale),
              soglia: dati[attivo.campoSoglia] as number,
            })}
          </p>
        </>
      )}
    </div>
  );
}
