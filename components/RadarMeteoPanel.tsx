"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

// Multilingua (06/10/2026): piccolo componente dedicato invece di una
// arrow function inline, perché il fallback di `loading` di next/dynamic
// è comunque reso dentro l'albero React (quindi dentro
// NextIntlClientProvider) — può usare useTranslations() come qualsiasi
// altro componente client.
function CaricamentoMappaRadar() {
  const t = useTranslations("radar");
  return <p className="text-ink-faint text-sm font-mono">{t("caricamentoMappa")}</p>;
}

// Leaflet richiede il DOM del browser (window/document) — niente
// rendering lato server, va caricato dinamicamente solo lato client
const RadarMeteoMap = dynamic(() => import("@/components/RadarMeteoMap").then((m) => m.RadarMeteoMap), {
  ssr: false,
  loading: () => <CaricamentoMappaRadar />,
});

type ProdottoRadar = {
  immagine: string;
  extent: [number, number, number, number] | null; // [minLon, maxLat, maxLon, minLat]
  aggiornato_al: string;
};

type RadarData = Partial<Record<"srtlbm_1" | "ssi" | "hmc" | "lbm_v", ProdottoRadar>>;

// Multilingua (06/10/2026): label e spiegazione non sono più testo
// italiano fisso nell'array ma chiavi (t("prodotti.<chiave>")/
// t("spiegazioni.<chiave>")) — solo `unita` resta qui (simbolo di unità
// di misura, identico in ogni lingua, non va tradotto).
const PRODOTTI = [
  { chiave: "srtlbm_1" as const, unita: "mm" },
  { chiave: "ssi" as const, unita: null },
  { chiave: "hmc" as const, unita: null },
  { chiave: "lbm_v" as const, unita: "m/s" },
];

export function RadarMeteoPanel() {
  const [dati, setDati] = useState<RadarData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [prodotto, setProdotto] = useState<(typeof PRODOTTI)[number]["chiave"]>("srtlbm_1");
  const t = useTranslations("radar");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "radar:fossalon")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as RadarData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 10 * 60 * 1000);
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

  const attivo = PRODOTTI.find((p) => p.chiave === prodotto)!;
  const etichettaAttivo = t(`prodotti.${attivo.chiave}`);
  const corrente = dati[prodotto];

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {PRODOTTI.map((p) => (
          <button
            key={p.chiave}
            onClick={() => setProdotto(p.chiave)}
            aria-pressed={prodotto === p.chiave}
            className={`px-2.5 py-1 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              prodotto === p.chiave ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {t(`prodotti.${p.chiave}`)}
          </button>
        ))}
      </div>

      <p className="text-ink-dim text-xs mb-3">{t(`spiegazioni.${attivo.chiave}`)}</p>

      {!corrente ? (
        <p className="text-ink-faint text-sm font-mono">{t("datiProdottoNonDisponibili", { prodotto: etichettaAttivo })}</p>
      ) : !corrente.extent ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={corrente.immagine} alt={t("ariaLabel", { prodotto: etichettaAttivo })} className="max-w-full rounded" />
          <p className="text-ink-faint text-[10px] font-mono mt-2">
            {t("aggiornatoFonte", { data: corrente.aggiornato_al })}
          </p>
        </div>
      ) : (
        (() => {
          const [minLon, maxLat, maxLon, minLat] = corrente.extent;
          const bounds: [[number, number], [number, number]] = [
            [minLat, minLon],
            [maxLat, maxLon],
          ];
          const centro: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
          return (
            <div>
              {/* role="region" + aria-label: vedi stessa nota in
                  TerremotiPage.tsx. Qui non esiste un elenco testuale
                  equivalente (è un'immagine radar continua, non un elenco
                  di eventi discreti) — limite noto, documentato nel README. */}
              <div
                role="region"
                aria-label={t("ariaLabel", { prodotto: etichettaAttivo })}
                className="rounded overflow-hidden"
                style={{ height: 320 }}
              >
                <RadarMeteoMap immagine={corrente.immagine} bounds={bounds} centro={centro} />
              </div>
              <p className="text-ink-faint text-[10px] font-mono mt-2">
                {etichettaAttivo}
                {attivo.unita ? ` (${attivo.unita})` : ""} · {t("dettaglioMappa", { data: corrente.aggiornato_al })}
              </p>
            </div>
          );
        })()
      )}
    </div>
  );
}
