import { getTranslations } from "next-intl/server";
import { AlertBannerLive } from "@/components/AlertBannerLive";
import { AllertaZonePanel } from "@/components/AllertaZonePanel";
import { AriaQualitaPanel } from "@/components/AriaQualitaPanel";
import { BalneazionePanel } from "@/components/BalneazionePanel";
import { CarburantiPanel } from "@/components/CarburantiPanel";
import { EventiPanel } from "@/components/EventiPanel";
import { FiumeOverview } from "@/components/FiumeOverview";
import { MeteoOverview } from "@/components/MeteoPanel";
import { NotiziePanel } from "@/components/NotiziePanel";
import { Panel } from "@/components/Panel";
import { MarePanel } from "@/components/MarePanel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { PolliniPanel } from "@/components/PolliniPanel";
import { SoleLunaPanel } from "@/components/SoleLunaPanel";
import { TgrCard } from "@/components/TgrCard";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { VentoPanel } from "@/components/VentoPanel";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { VoliPanel } from "@/components/VoliPanel";
import { PROVINCE_LIST } from "@/lib/province";
import { Link } from "@/i18n/navigation";

// Fase 1 — Multilingua (03/10/2026): solo il "guscio" della homepage è
// tradotto (titolo invisibile, etichette dei pannelli, sezione
// Ambiente, riga fonti nel footer) — i pannelli importati sopra
// (MeteoOverview, NotiziePanel, ecc.) restano con contenuto in
// italiano perché derivano da fonti esterne (OSMER, ANSA, Protezione
// Civile...) che non vengono tradotte in questa fase, come deciso con
// l'utente. Diventato Server Component async per usare
// getTranslations (prima era una funzione sincrona).
export default async function Home() {
  const t = await getTranslations("home");

  return (
    <>
      <TopHeader paginaAttiva="regione" />
      <div className="isobar" />

      <div className="max-w-[1180px] mx-auto px-5">
        <AlertBannerLive />
      </div>

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        {/* h1 invisibile: vedi stessa nota in ProvinciaPage.tsx — la
            homepage non aveva nessun heading, solo il logo testuale
            nell'header (non marcato come h1). Design visivo invariato. */}
        <h1 className="sr-only">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mb-8">
          <Panel title={t("panels.meteo")} linkLabel={t("panels.meteoLink")} linkHref="https://www.meteo.fvg.it" span={2}>
            <MeteoOverview />
          </Panel>

          <Panel title={t("panels.allerte")} linkLabel={t("panels.allerteLink")} linkHref="https://www.protezionecivile.fvg.it/it/allerte-tutte">
            <AllertaZonePanel />
            <p className="text-ink-faint text-xs font-mono mb-2">
              {t("panels.allerteDettaglio")}
            </p>
            <div className="flex flex-wrap gap-2">
              {PROVINCE_LIST.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="text-xs font-mono text-cool-ink hover:underline"
                >
                  {p.nome} →
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title={t("panels.notizie")} linkLabel={t("panels.notizieLink")} linkHref="https://www.ansa.it/friuliveneziagiulia/">
            <NotiziePanel />
          </Panel>

          {/* Sole e luna (04/09/2026): unico pannello del sito senza fonte
              esterna, calcolato nel browser — vedi SoleLunaPanel.tsx.
              Ripetuto identico nella sezione Meteo (/meteo). */}
          <Panel title={t("panels.soleLuna")}>
            <SoleLunaPanel />
          </Panel>

          <Panel title={t("panels.viabilita")} linkLabel={t("panels.viabilitaLink")} linkHref="https://infoviaggiando.it">
            <ViabilitaPanel />
          </Panel>

          <Panel
            title={t("panels.carburanti")}
            linkLabel={t("panels.carburantiLink")}
            linkHref="https://www.mimit.gov.it/it/prezzo-medio-carburanti/regioni"
          >
            <CarburantiPanel />
          </Panel>

          <Panel
            title={t("panels.voli")}
            linkLabel={t("panels.voliLink")}
            linkHref="https://triesteairport.it/it/airport/voli-e-destinazioni/voli-in-tempo-reale/"
            span={2}
          >
            <VoliPanel />
          </Panel>

          <Panel title={t("panels.tgr")}>
            <TgrCard />
          </Panel>

          <Panel title={t("panels.eventi")} linkLabel={t("panels.eventiLink")} linkHref="https://www.turismofvg.it/eventi" span={2}>
            <EventiPanel />
          </Panel>
        </div>

        {/* Sezione Ambiente (04/09/2026): raggruppa i dati ambientali che
            prima erano sparsi nella griglia principale — stesso pattern
            h2 + griglia separata già usato in ViabilitaPage.tsx per
            "Webcam autostradali". Bora/vento e pioggia restano anche qui
            (oltre che nella sezione Meteo) perché "tempo" in senso stretto,
            ma l'utente li ha chiesti esplicitamente anche sotto Ambiente. */}
        <h2 className="font-cond font-bold text-xl uppercase tracking-wide mb-1">{t("ambiente.title")}</h2>
        <p className="text-ink-faint text-xs font-mono mb-4">
          {t("ambiente.description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
          <Panel
            title={t("ambiente.bora")}
            linkLabel={t("ambiente.boraLink")}
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <VentoPanel compatto />
            <div className="border-t border-line my-4" />
            <PioggiaPanel compatto />
          </Panel>

          <Panel title={t("ambiente.aria")} linkLabel={t("ambiente.ariaLink")} linkHref="https://www.arpa.fvg.it">
            <AriaQualitaPanel />
          </Panel>

          <Panel title={t("ambiente.pollini")} linkLabel={t("ambiente.polliniLink")} linkHref="https://www.arpa.fvg.it/temi/temi/pollini/">
            <PolliniPanel />
          </Panel>

          <Panel
            title={t("ambiente.livelli")}
            linkLabel={t("ambiente.livelliLink")}
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1.5">{t("ambiente.mare")}</p>
            <MarePanel />
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1.5 mt-4">{t("ambiente.fiumi")}</p>
            <FiumeOverview />
          </Panel>

          <Panel
            title={t("ambiente.balneazione")}
            linkLabel={t("ambiente.balneazioneLink")}
            linkHref="https://www.arpa.fvg.it/temi/temi/acqua/sezioni-principali/balneazione/"
            span={2}
          >
            <BalneazionePanel />
          </Panel>
        </div>
      </main>

      <Footer extra={<span>{t("fonti")}</span>} />
    </>
  );
}
