"use client";

import { useEffect, useState } from "react";
import { ZoneChip } from "@/components/ZoneChip";
import type { ProvinciaSlug } from "@/lib/province";
import { fetchAllertaProvincia, ISTATCODE_PROVINCIA } from "@/lib/allerte";

export function ZonaAllertamentoLive({ provincia }: { provincia: ProvinciaSlug }) {
  const [zona, setZona] = useState<"A" | "B" | "C" | "D" | null>(null);

  useEffect(() => {
    let attivo = true;
    async function carica() {
      try {
        const esito = await fetchAllertaProvincia(ISTATCODE_PROVINCIA[provincia]);
        if (attivo) setZona(esito.zona);
      } catch {
        // fallisce silenziosamente: resta il fallback "n.d." sotto
      }
    }
    carica();
    const id = setInterval(carica, 10 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [provincia]);

  if (!zona) return <span className="text-ink-faint text-xs font-mono">n.d.</span>;
  return <ZoneChip zone={zona} size="md" />;
}
