"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { VALICHI } from "@/lib/confini";
import { supabase } from "@/lib/supabase";

type Evento = {
  autostrada: string;
  carreggiata: string;
  testo: string;
  inizio: string;
  fine: string | null;
  fonte: string;
};

type ViabilitaData = { eventi: Evento[]; aggiornato_al: string };

type EventoPrometsi = {
  titolo: string | null;
  descrizione: string | null;
  causa: string | null;
  zastoj: boolean;
  codaM: number | null;
  ritardoSec: number | null;
  stradaChiusa: boolean;
  alValico: boolean;
};

type ValicoPrometsi = {
  eventi: EventoPrometsi[];
  osservatoIl: string | null;
  controllatoIl: string;
  stale: boolean;
  errore: string | null;
};

type ConfiniPrometsiData = { generatoIl: string; perValico: Record<string, ValicoPrometsi> };

// Viabilità → Confini (16/09/2026, esteso il 16/09/2026 — sblocco
// Promet.si). Vedi il commento esteso in cima a lib/confini.ts per il
// contesto completo. Questa sezione mostra: anagrafica per tutti e 15 i
// valichi; per i 2 valichi autostradali, gli eventi reali già raccolti
// dall'ingestione esistente `viabilita:autostrade` (lato italiano); per
// i 4 valichi con `codiceStradaPromet` valorizzato, anche gli eventi
// reali raccolti da `ingestConfiniPrometsi()` (lato sloveno, snapshot
// `confini-prometsi`) — mostrati come sezione separata perché sono
// fonti e lati diversi, non lo stesso dato. Per gli altri 9 valichi
// nessuna fonte live verificata (vedi dettaglio nel commento di
// lib/confini.ts).
export function ConfiniSection() {
  const [dati, setDati] = useState<ViabilitaData | null>(null);
  const [datiPrometsi, setDatiPrometsi] = useState<ConfiniPrometsiData | null>(null);
  const t = useTranslations("confini");
  const tChrome = useTranslations("chrome");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const [autostrade, prometsi] = await Promise.all([
        supabase.from("snapshots").select("data").eq("id", "viabilita:autostrade").single(),
        supabase.from("snapshots").select("data").eq("id", "confini-prometsi").single(),
      ]);
      if (!attivo) return;
      if (!autostrade.error && autostrade.data) setDati(autostrade.data.data as ViabilitaData);
      if (!prometsi.error && prometsi.data) setDatiPrometsi(prometsi.data.data as ConfiniPrometsiData);
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const eventiPerAutostrada = (codici: string[]) =>
    codici.length === 0 ? [] : (dati?.eventi ?? []).filter((e) => codici.includes(e.autostrada));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {VALICHI.map((v) => {
        const eventiIt = eventiPerAutostrada(v.autostradeCollegate);
        const datiSi = v.codiceStradaPromet ? datiPrometsi?.perValico[v.id] : undefined;
        const haFonteLive = v.autostradeCollegate.length > 0 || !!v.codiceStradaPromet;

        return (
          <div key={v.id} className="border border-line rounded p-4 bg-panel">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold">{v.nome}</span>
              <span className="text-ink-faint text-[10px] font-mono uppercase">{t(`paese.${v.paese}`)}</span>
            </div>
            <div className="text-ink-dim text-xs mt-0.5">→ {v.nomeStraniero}</div>

            <div className="text-ink-faint text-[10px] font-mono mt-2">
              {v.comuneIt} ({v.stradaIt}) ↔ {v.comuneStraniero} ({v.stradaStraniera})
            </div>
            <div className="text-ink-faint text-[10px] font-mono uppercase mt-0.5">
              {t(`modalita.${v.modalita}`)} · {t(`classe.${v.classe}`)}
            </div>

            {v.note && <div className="text-ink-dim text-xs mt-2">{v.note}</div>}

            {!haFonteLive && (
              <div className="mt-3 pt-2 border-t border-line">
                <div className="text-ink-faint text-[10px] font-mono uppercase">
                  {t("nessunaFonteLive")}
                </div>
              </div>
            )}

            {v.autostradeCollegate.length > 0 && (
              <div className="mt-3 pt-2 border-t border-line">
                <div className="text-ink-faint text-[9px] font-mono uppercase mb-1">{t("latoItaliano")}</div>
                {eventiIt.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {eventiIt.map((e, i) => (
                      <div key={i} className="text-xs text-ink-dim">
                        <span className="font-cond font-semibold">{e.autostrada}</span> {e.testo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-ink-faint text-[10px] font-mono uppercase">
                    {t("nessunEventoAutostrada", { strade: v.autostradeCollegate.join("/") })}
                  </div>
                )}
              </div>
            )}

            {v.codiceStradaPromet && (
              <div className="mt-3 pt-2 border-t border-line">
                <div className="text-ink-faint text-[9px] font-mono uppercase mb-1">
                  {t("latoSloveno")} {datiSi?.stale && t("datiNonAggiornatiSuffix")}
                </div>
                {!datiPrometsi ? (
                  <div className="text-ink-faint text-[10px] font-mono uppercase">{tChrome("caricamento")}</div>
                ) : !datiSi || datiSi.errore ? (
                  <div className="text-ink-faint text-[10px] font-mono uppercase">
                    {t("datiSloveniNonDisponibili")}
                  </div>
                ) : datiSi.eventi.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {datiSi.eventi.map((e, i) => (
                      <div key={i} className="text-xs text-ink-dim">
                        <span className="font-cond font-semibold">{v.codiceStradaPromet}</span>{" "}
                        {e.descrizione ?? e.titolo}
                        {e.zastoj && e.codaM ? t("codaM", { m: e.codaM }) : ""}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-ink-faint text-[10px] font-mono uppercase">
                    {t("nessunEventoValico", { codice: v.codiceStradaPromet })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
