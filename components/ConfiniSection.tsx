"use client";

import { useEffect, useState } from "react";
import { VALICHI, NOME_PAESE, ETICHETTA_MODALITA, ETICHETTA_CLASSE } from "@/lib/confini";
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

// Viabilità → Confini (16/09/2026). Vedi il commento esteso in cima a
// lib/confini.ts per perché questa sezione mostra SOLO anagrafica +
// (per i soli 2 valichi autostradali) gli eventi reali già raccolti
// dall'ingestione esistente `viabilita:autostrade` — nessuna nuova
// fonte aggiunta, nessun dato di traffico/coda/tempo di percorrenza
// per gli altri 13 valichi (nessuna fonte verificabile da questa
// sessione per Slovenia/Austria/strade statali, vedi dettaglio nel
// commento di lib/confini.ts).
export function ConfiniSection() {
  const [dati, setDati] = useState<ViabilitaData | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "viabilita:autostrade").single();
      if (!attivo || error || !data) return;
      setDati(data.data as ViabilitaData);
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
        const eventi = eventiPerAutostrada(v.autostradeCollegate);
        return (
          <div key={v.id} className="border border-line rounded p-4 bg-panel">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold">{v.nome}</span>
              <span className="text-ink-faint text-[10px] font-mono uppercase">{NOME_PAESE[v.paese]}</span>
            </div>
            <div className="text-ink-dim text-xs mt-0.5">→ {v.nomeStraniero}</div>

            <div className="text-ink-faint text-[10px] font-mono mt-2">
              {v.comuneIt} ({v.stradaIt}) ↔ {v.comuneStraniero} ({v.stradaStraniera})
            </div>
            <div className="text-ink-faint text-[10px] font-mono uppercase mt-0.5">
              {ETICHETTA_MODALITA[v.modalita]} · {ETICHETTA_CLASSE[v.classe]}
            </div>

            {v.note && <div className="text-ink-dim text-xs mt-2">{v.note}</div>}

            <div className="mt-3 pt-2 border-t border-line">
              {v.autostradeCollegate.length > 0 ? (
                eventi.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {eventi.map((e, i) => (
                      <div key={i} className="text-xs text-ink-dim">
                        <span className="font-cond font-semibold">{e.autostrada}</span> {e.testo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-ink-faint text-[10px] font-mono uppercase">
                    Nessun evento in corso su {v.autostradeCollegate.join("/")}
                  </div>
                )
              ) : (
                <div className="text-ink-faint text-[10px] font-mono uppercase">
                  Nessuna fonte live verificata per questo valico
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
