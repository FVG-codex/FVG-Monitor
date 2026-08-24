"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TopHeader } from "@/components/TopHeader";
import { WebcamCard, type Webcam } from "@/components/WebcamCard";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type WebcamData = { webcam: Webcam[]; aggiornato_al: string };

// Le webcam autostradali (A4/A23/A28/SR354) vivono nella pagina
// dedicata /viabilita, insieme agli eventi di traffico — non qui
const ZONE_ESCLUSE = new Set(["A4", "A23", "A28", "SR354"]);

// Panorami 360° di turismofvg.it — widget di terze parti (Panomax e
// Feratel), elenco statico: sono pochi e non cambiano spesso, non
// serve un'ingestione dedicata.
const PANORAMI_360: { nome: string; src: string; provincia: ProvinciaSlug }[] = [
  { nome: "Monte Lussari", src: "https://webtv.feratel.com/webtv/?design=v4&t=1&cam=6270", provincia: "udine" },
  { nome: "Forni di Sopra", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2668&mode=simple-square", provincia: "udine" },
  { nome: "Piancavallo", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2662&mode=simple-square", provincia: "pordenone" },
  { nome: "Sappada", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2556&mode=simple-square", provincia: "udine" },
  { nome: "Sella Nevea", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2665&mode=simple-square", provincia: "udine" },
  { nome: "Sella Nevea - Campi scuola", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=1854783&mode=simple-square", provincia: "udine" },
  { nome: "Zoncolan", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2669&mode=simple-square", provincia: "udine" },
  { nome: "Grado", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=3011&mode=simple-square", provincia: "gorizia" },
  { nome: "Lignano", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=3383&mode=simple-square", provincia: "udine" },
  { nome: "San Daniele del Friuli", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=4053520&mode=simple-square", provincia: "udine" },
  { nome: "Trieste San Giusto", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2925487&mode=simple-square", provincia: "trieste" },
];

export function WebcamPage() {
  const [dati, setDati] = useState<WebcamData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const [filtro, setFiltro] = useState<ProvinciaSlug | "tutte">("tutte");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "webcam:osmer")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as WebcamData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 60 * 60 * 1000); // l'elenco cambia raramente
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const webcamRegionali = (dati?.webcam ?? []).filter((w) => !ZONE_ESCLUSE.has(w.zona));
  const webcamFiltrate =
    filtro === "tutte" ? webcamRegionali : webcamRegionali.filter((w) => w.provincia === filtro);
  const panoramiFiltrati =
    filtro === "tutte" ? PANORAMI_360 : PANORAMI_360.filter((p) => p.provincia === filtro);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Webcam regionali</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Immagini fornite da OSMER ARPA FVG (CC BY-SA 3.0) — la validità dei dati non è garantita da ARPA FVG,
          che aggrega webcam gestite da terzi. Clicca su una webcam per aprire la fonte originale
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFiltro("tutte")}
            aria-pressed={filtro === "tutte"}
            className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              filtro === "tutte" ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            Tutta la regione
          </button>
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setFiltro(p.slug)}
              aria-pressed={filtro === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                filtro === p.slug ? "bg-cool text-bg" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">Dati non disponibili al momento.</p>
        )}

        {stato === "ready" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {webcamFiltrate.map((w, i) => (
              <WebcamCard key={i} webcam={w} />
            ))}
          </div>
        )}

        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mt-10 mb-1">Panorami 360°</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">Fonte: Turismo FVG (Panomax / Feratel)</p>

        {panoramiFiltrati.length === 0 ? (
          <p className="text-ink-faint text-sm font-mono">Nessun panorama disponibile per questa provincia.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {panoramiFiltrati.map((p) => (
              <div key={p.nome} className="border border-line rounded overflow-hidden bg-panel">
                <div className="px-3 py-2 font-cond font-semibold text-sm border-b border-line">{p.nome}</div>
                <iframe src={p.src} title={p.nome} className="w-full h-64 border-0" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
