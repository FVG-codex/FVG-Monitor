"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ZoneChip } from "@/components/ZoneChip";
import type { ProvinciaSlug } from "@/lib/province";

type AllertaData = {
  per_provincia: Partial<Record<ProvinciaSlug, { zona: "A" | "B" | "C" | "D" | null }>>;
};

export function ZonaAllertamentoLive({ provincia }: { provincia: ProvinciaSlug }) {
  const [zona, setZona] = useState<"A" | "B" | "C" | "D" | null>(null);

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
      setZona(d.per_provincia[provincia]?.zona ?? null);
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [provincia]);

  if (!zona) return <span className="text-ink-faint text-xs font-mono">n.d.</span>;
  return <ZoneChip zone={zona} size="md" />;
}
