"use client";

import { useEffect, useState } from "react";
import { fetchTutteLeAllerte, type AllertaSingola } from "@/lib/allerte";

const LIVELLO_STYLES: Record<string, string> = {
  gialla: "bg-allerta-gialla text-[#241B04]",
  arancione: "bg-allerta-arancione text-[#241B04]",
  rossa: "bg-allerta-rossa text-ink",
};

export function AlertBannerLive() {
  const [banner, setBanner] = useState<AllertaSingola | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const perProvincia = await fetchTutteLeAllerte();
      if (!attivo) return;

      const tutte = Object.values(perProvincia).flatMap((p) => p?.allerte ?? []);
      // Deduplicata per titolo (un'allerta regionale compare identica su più province)
      const uniche = [...new Map(tutte.map((a) => [a.titolo, a])).values()];
      const piuSevera = uniche.sort((a, b) => b.livello - a.livello)[0] ?? null;
      setBanner(piuSevera);
    }
    carica();
    const id = setInterval(carica, 10 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  // Nessuna allerta attiva (o dati non ancora caricati): nessun banner
  // mostrato — comportamento corretto, non un errore
  if (!banner) return null;

  return (
    <div className="flex items-center gap-3 py-2 font-cond text-[15px] border-b border-line">
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex-shrink-0 ${LIVELLO_STYLES[banner.livelloNome] ?? LIVELLO_STYLES.gialla}`}
      >
        Allerta {banner.livelloNome}
      </span>
      <span className="text-ink-dim">{banner.messaggio}</span>
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-cool text-sm flex-shrink-0 whitespace-nowrap">
        Dettagli ufficiali →
      </a>
    </div>
  );
}
