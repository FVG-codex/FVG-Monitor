"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TopHeader } from "@/components/TopHeader";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type Webcam = {
  nome: string;
  zona: string;
  provincia: ProvinciaSlug | null;
  immagine: string;
  descrizione: string | null;
  link: string | null;
};

type WebcamData = { webcam: Webcam[]; aggiornato_al: string };

// Panorami 360° di turismofvg.it — widget di terze parti (Panomax e
// Feratel), elenco statico: sono pochi e non cambiano spesso, non
// serve un'ingestione dedicata.
const PANORAMI_360 = [
  { nome: "Monte Lussari", src: "https://webtv.feratel.com/webtv/?design=v4&t=1&cam=6270" },
  { nome: "Forni di Sopra", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2668&mode=simple-square" },
  { nome: "Piancavallo", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2662&mode=simple-square" },
  { nome: "Sappada", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2556&mode=simple-square" },
  { nome: "Sella Nevea", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2665&mode=simple-square" },
  { nome: "Zoncolan", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2669&mode=simple-square" },
  { nome: "Grado", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=3011&mode=simple-square" },
  { nome: "Lignano", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=3383&mode=simple-square" },
  { nome: "San Daniele del Friuli", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=4053520&mode=simple-square" },
  { nome: "Trieste San Giusto", src: "https://www.turismofvg.it/StaticPage/PanomaxWidget?code=2925487&mode=simple-square" },
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

  const webcamFiltrate =
    filtro === "tutte" ? dati?.webcam ?? [] : (dati?.webcam ?? []).filter((w) => w.provincia === filtro);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Webcam regionali</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Immagini fornite da OSMER ARPA FVG (CC BY-SA 3.0) — la validità dei dati non è garantita da ARPA FVG,
          che aggrega webcam gestite da terzi
        </p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setFiltro("tutte")}
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
            {webcamFiltrate.map((w, i) => {
              const Card = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.immagine} alt={w.nome} loading="lazy" className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <div className="font-cond font-semibold text-sm leading-tight">{w.nome}</div>
                    <div className="font-mono text-[10px] text-ink-faint mt-0.5">{w.zona}</div>
                  </div>
                </>
              );
              return w.link ? (
                <a
                  key={i}
                  href={w.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-line rounded overflow-hidden bg-panel hover:border-cool transition-colors"
                >
                  {Card}
                </a>
              ) : (
                <div key={i} className="border border-line rounded overflow-hidden bg-panel">
                  {Card}
                </div>
              );
            })}
          </div>
        )}

        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mt-10 mb-1">Panorami 360°</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">Fonte: Turismo FVG (Panomax / Feratel)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PANORAMI_360.map((p) => (
            <div key={p.nome} className="border border-line rounded overflow-hidden bg-panel">
              <div className="px-3 py-2 font-cond font-semibold text-sm border-b border-line">{p.nome}</div>
              <iframe src={p.src} title={p.nome} className="w-full h-64 border-0" loading="lazy" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
