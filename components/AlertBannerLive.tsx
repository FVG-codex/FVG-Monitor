"use client";

import { useEffect, useState } from "react";
import { fetchTutteLeAllerte, type AllertaSingola } from "@/lib/allerte";

const LIVELLO_STYLES: Record<string, string> = {
  gialla: "bg-allerta-gialla text-[#241B04]",
  arancione: "bg-allerta-arancione text-[#241B04]",
  // text-white invece di text-ink: vedi stessa nota in AlertBanner.tsx
  // (componente gemello) — 4.44:1 con text-ink, 5.42:1 con bianco puro.
  rossa: "bg-allerta-rossa text-white",
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
    // flex-wrap: sullo schermo di un telefono il badge (nowrap) + il
    // link "Dettagli ufficiali →" (nowrap) da soli possono già occupare
    // quasi tutta la larghezza disponibile — senza flex-wrap il
    // messaggio dell'allerta troverebbe uno spazio negativo e farebbe
    // traboccare l'intero banner in orizzontale invece di andare a capo
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 font-cond text-[15px] border-b border-line">
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex-shrink-0 ${LIVELLO_STYLES[banner.livelloNome] ?? LIVELLO_STYLES.gialla}`}
      >
        Allerta {banner.livelloNome}
      </span>
      <span className="text-ink-dim min-w-0">{banner.messaggio}</span>
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-cool-ink text-sm flex-shrink-0 whitespace-nowrap">
        Dettagli ufficiali →<span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    </div>
  );
}
