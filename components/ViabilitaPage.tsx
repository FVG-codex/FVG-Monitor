"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { CarburantiPanel } from "@/components/CarburantiPanel";
import { Panel } from "@/components/Panel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { ConfiniSection } from "@/components/ConfiniSection";
import { WebcamCard, type Webcam } from "@/components/WebcamCard";
import { ColonninePanel } from "@/components/ColonninePanel";
import { InfolavoriPanel } from "@/components/InfolavoriPanel";

type WebcamData = { webcam: Webcam[]; aggiornato_al: string };

const ZONE_AUTOSTRADE = new Set(["A4", "A23", "A28", "SR354"]);

export function ViabilitaPage() {
  const [dati, setDati] = useState<WebcamData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("viabilita");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");
  const tChrome = useTranslations("chrome");

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
    const id = setInterval(carica, 60 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  const webcamAutostrade = (dati?.webcam ?? []).filter((w) => ZONE_AUTOSTRADE.has(w.zona));

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">{tNav("viabilita")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">{t("descrizione")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mb-8">
          <Panel title={t("eventiInCorso")} linkLabel="InfoViaggiando →" linkHref="https://infoviaggiando.it" span={2}>
            <ViabilitaPanel />
          </Panel>

          <Panel
            title={tHome("panels.carburanti")}
            linkLabel="MIMIT →"
            linkHref="https://www.mimit.gov.it/it/prezzo-medio-carburanti/regioni"
          >
            <CarburantiPanel />
          </Panel>

          {/* Colonnine elettriche (03/10/2026, spostata qui da Trasporti su
              richiesta dell'utente lo stesso giorno) — pagina dedicata
              (/colonnine-elettriche), qui solo un riassunto con link. */}
          <Panel title={t("colonnineElettriche")} span={3}>
            <ColonninePanel />
          </Panel>

          {/* Info lavori (06/10/2026, richiesta dell'utente): cantieri
              segnalati da FVG Strade SpA attivi nella giornata odierna
              — vedi InfolavoriPanel.tsx e ingestInfolavori() in
              scripts/ingest-light.mjs per la logica di filtro. */}
          <Panel
            title={t("infolavori")}
            linkLabel="FVG Strade →"
            linkHref="https://www.fvgstrade.it/infolavori"
            span={3}
          >
            <InfolavoriPanel />
          </Panel>
        </div>

        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mb-1">{t("webcamAutostradali")}</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("webcamAutostradaliDescrizione")}</p>

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && (
          <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>
        )}
        {stato === "ready" && webcamAutostrade.length === 0 && (
          <p className="text-ink-faint text-sm font-mono">{t("nessunaWebcamAutostradale")}</p>
        )}

        {stato === "ready" && webcamAutostrade.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {webcamAutostrade.map((w, i) => (
              <WebcamCard key={i} webcam={w} />
            ))}
          </div>
        )}

        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mb-1 mt-8">{t("confini")}</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("confiniDescrizione")}</p>
        <ConfiniSection />
      </main>

      <Footer />
    </>
  );
}
