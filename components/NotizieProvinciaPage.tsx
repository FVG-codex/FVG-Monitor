"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import { PROVINCE_NOTIZIE_ATTIVE, type SnapshotNotizieProvincia } from "@/lib/notizieProvincia";

function tempoRelativo(dataStr: string): string {
  const diffMs = Date.now() - new Date(dataStr).getTime();
  const minuti = Math.floor(diffMs / 60000);
  if (minuti < 60) return `${minuti} min fa`;
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  return `${Math.floor(ore / 24)} g fa`;
}

/**
 * Notizie locali per provincia (05/09/2026) — distinta dal pannello ANSA
 * regionale di homepage (NotiziePanel.tsx, invariato): qui si aggregano
 * fonti iper-locali, una provincia alla volta. Solo Trieste è attiva per
 * ora (PROVINCE_NOTIZIE_ATTIVE) — le altre 3 mostrano un messaggio "in
 * arrivo" invece di un tab disabilitato, così restano comunque
 * esplorabili e il layout non cambia quando si aggiungono.
 */
export function NotizieProvinciaPage() {
  const [provincia, setProvincia] = useState<ProvinciaSlug>("trieste");
  const [dati, setDati] = useState<SnapshotNotizieProvincia | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  const attiva = PROVINCE_NOTIZIE_ATTIVE.includes(provincia);

  useEffect(() => {
    if (!attiva) return;
    let attivoEffect = true;
    setStato("loading");
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", `notizie-provincia:${provincia}`)
        .single();
      if (!attivoEffect) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotNotizieProvincia);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivoEffect = false;
      clearInterval(id);
    };
  }, [provincia, attiva]);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Notizie</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Notizie locali per provincia, da fonti diverse dall&apos;ANSA regionale già in homepage
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setProvincia(p.slug)}
              aria-pressed={provincia === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                provincia === p.slug
                  ? "bg-cool text-on-accent"
                  : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-px bg-line border border-line">
          <Panel title={`Notizie · ${PROVINCE[provincia].nome}`}>
            {!attiva ? (
              <p className="text-ink-faint text-sm font-mono">
                Notizie per {PROVINCE[provincia].nome} in arrivo in una prossima fase.
              </p>
            ) : stato === "loading" ? (
              <p className="text-ink-faint text-sm font-mono">Caricamento notizie…</p>
            ) : stato === "error" || !dati || dati.items.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">Notizie non disponibili al momento.</p>
            ) : (
              <div>
                {dati.items.map((n, i) => (
                  <div key={n.link} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="text-ink text-[15px] leading-snug mb-1.5 hover:text-cool-ink transition-colors">
                        {n.titolo}
                        <span className="sr-only"> (si apre in una nuova scheda)</span>
                      </div>
                    </a>
                    <div className="flex gap-2 items-center font-mono text-[10px] text-ink-faint uppercase tracking-wide">
                      <span className="text-warm">{n.fonte}</span>
                      <span>· {tempoRelativo(n.data)}</span>
                    </div>
                  </div>
                ))}
                {dati.fonti.length > 0 && (
                  <p className="text-ink-faint text-[10px] font-mono mt-3 pt-3 border-t border-line">
                    Fonti:{" "}
                    {dati.fonti.map((f, i) => (
                      <span key={f.fonte_url}>
                        {i > 0 && " · "}
                        <a
                          href={f.fonte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cool-ink"
                        >
                          {f.fonte}
                          <span className="sr-only"> (si apre in una nuova scheda)</span>
                        </a>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
