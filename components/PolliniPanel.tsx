"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { intlLocale } from "@/lib/intlLocale";

type Polline = { famiglia: string | null; genere: string; media: number };
type StazionePollini = { stazione: string; pollini: Polline[] };

type SnapshotPollini = {
  dal: string | null;
  al: string;
  per_provincia: Partial<Record<ProvinciaSlug, StazionePollini[]>>;
};

function formattaData(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
}

// provincia opzionale (11/09/2026, per la nuova pagina "Dati ambientali"
// sotto Ambiente): quando assente resta il comportamento di sempre (tab
// interno, usato in homepage), quando presente la provincia è imposta
// dall'esterno e i tab interni non vengono mostrati — stesso principio
// già usato per VentoPanel/PioggiaPanel/FiumePanel.
export function PolliniPanel({ provincia: provinciaProp }: { provincia?: ProvinciaSlug } = {}) {
  const [dati, setDati] = useState<SnapshotPollini | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [tabInterno, setTabInterno] = useState<ProvinciaSlug>("trieste");
  const tab = provinciaProp ?? tabInterno;
  const t = useTranslations("pollini");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "pollini").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotPollini);
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
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">{t("nonDisponibili")}</p>;
  }

  const stazioni = dati.per_provincia[tab];
  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;

  return (
    <div>
      {!provinciaProp && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setTabInterno(p.slug)}
              aria-pressed={tab === p.slug}
              className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                tab === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {!stazioni || stazioni.length === 0 ? (
        <p className="text-ink-faint text-sm font-mono">
          {t("nessunaStazione", { provincia: nomeProvincia })}
        </p>
      ) : (
        <div className="space-y-3">
          {stazioni.map((s) => (
            <div key={s.stazione}>
              <div className="font-mono text-[10px] text-ink-faint uppercase mb-1">{s.stazione}</div>
              {s.pollini.length === 0 ? (
                <p className="text-ink-faint text-xs font-mono">{t("nessunPolline")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {s.pollini.map((pol) => (
                    <div key={pol.genere} className="border border-line rounded px-2 py-1 text-center">
                      <div className="font-cond font-semibold text-xs">{pol.genere}</div>
                      <div className="font-mono text-[11px] text-cool-ink">{pol.media}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-ink-faint text-[10px] font-mono mt-3 pt-3 border-t border-line">
        {dati.dal
          ? t("settimana", { da: formattaData(dati.dal, locale), a: formattaData(dati.al, locale) })
          : t("aggiornatoAl", { data: formattaData(dati.al, locale) })}
        {t("unitaFonte")}
      </p>
    </div>
  );
}
