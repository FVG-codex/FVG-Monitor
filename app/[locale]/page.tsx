import { getTranslations } from "next-intl/server";
import { AlertBannerLive } from "@/components/AlertBannerLive";
import { AllertaZonePanel } from "@/components/AllertaZonePanel";
import { BlsdHomeRiepilogo } from "@/components/BlsdHomeRiepilogo";
import { CarburantiPanel } from "@/components/CarburantiPanel";
import { EventiPanel } from "@/components/EventiPanel";
import { MeteoOverview } from "@/components/MeteoPanel";
import { NotiziePanel } from "@/components/NotiziePanel";
import { Panel } from "@/components/Panel";
import { SoleLunaPanel } from "@/components/SoleLunaPanel";
import { TgrCard } from "@/components/TgrCard";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { ViabilitaPanel } from "@/components/ViabilitaPanel";
import { VoliPanel } from "@/components/VoliPanel";
import { PROVINCE_LIST } from "@/lib/province";
import { Link } from "@/i18n/navigation";

// Fase 1 — Multilingua (03/10/2026): solo il "guscio" della homepage è
// tradotto (titolo invisibile, etichette dei pannelli, riga fonti nel
// footer) — i pannelli importati sopra (MeteoOverview, NotiziePanel,
// ecc.) restano con contenuto in italiano perché derivano da fonti
// esterne (OSMER, ANSA, Protezione Civile...) che non vengono tradotte
// in questa fase, come deciso con l'utente. Diventato Server Component
// async per usare getTranslations (prima era una funzione sincrona).
//
// Sezione "Ambiente" rimossa dalla homepage (15/10/2026, richiesto
// dall'utente: "Togli dalla homepage tutti i dati ambientali e fa in
// modo che i dati rimangano solamente nella sezione ambiente"). I
// pannelli Vento/Pioggia/Qualità aria/Pollini/Mare/Fiumi/Balneazione
// non sono spariti dal sito: restano disponibili sotto l'hub Ambiente,
// già duplicati per provincia in DatiAmbientaliPage.tsx (/dati-ambientali)
// da quando quella pagina è stata introdotta — qui in homepage c'era
// solo una vista aggregata ridondante. Il pannello "Meteo" (MeteoOverview)
// resta in homepage con il bollettino previsionale OSMER (cielo/pioggia
// prevista in testo libero, non i dati in tempo reale di Vento/Pioggia).
//
// Pannello "DAE · Defibrillatori" (15/10/2026, richiesto dall'utente:
// "censimento dei BLSD... un modulo in homepage ed una pagina dedicata in
// sanità") — qui solo un riepilogo (conteggio totale + per provincia) con
// link alla pagina dedicata /blsd; il contenuto completo con scheda per
// dispositivo vive lì, vedi BlsdPage.tsx e lib/blsd.ts per fonte e limiti.
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

          <Panel title={t("panels.blsd")}>
            <BlsdHomeRiepilogo />
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
      </main>

      <Footer extra={<span>{t("fonti")}</span>} />
    </>
  );
}
