"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Livello = "gialla" | "arancione" | "rossa";

const LIVELLO_STYLES: Record<Livello, string> = {
  gialla: "bg-allerta-gialla text-[#241B04]",
  arancione: "bg-allerta-arancione text-[#241B04]",
  rossa: "bg-allerta-rossa text-ink",
};

type Banner = {
  titolo: string;
  messaggio: string;
  livelloNome: Livello;
  link: string;
} | null;

type AllertaData = { banner: Banner };

export function AlertBannerLive() {
  const [banner, setBanner] = useState<Banner>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "allerta:overview")
        .single();
      if (!attivo || error || !data) return;
      const d = data.data as AllertaData;
      setBanner(d.banner);
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  // Nessuna allerta attiva: nessun banner mostrato (comportamento corretto,
  // non un errore — è lo stato "normale" per la maggior parte del tempo)
  if (!banner) return null;

  return (
    <div className="flex items-center gap-3 py-2 font-cond text-[15px] border-b border-line">
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex-shrink-0 ${LIVELLO_STYLES[banner.livelloNome] ?? LIVELLO_STYLES.gialla}`}
      >
        Allerta {banner.livelloNome}
      </span>
      <span className="text-ink-dim">{banner.messaggio}</span>
      <a href={banner.link} className="ml-auto text-cool text-sm flex-shrink-0 whitespace-nowrap">
        Dettagli ufficiali →
      </a>
    </div>
  );
}
