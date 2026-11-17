import { getTranslations } from "next-intl/server";
import { AlertBannerLive } from "@/components/AlertBannerLive";
import { AllertaZonePanel } from "@/components/AllertaZonePanel";
import { BlsdHomeRiepilogo } from "@/components/BlsdHomeRiepilogo";
import { CarburantiPanel } from "@/components/CarburantiPanel";
import { EventiPanel } from "@/components/EventiPanel";
import { FarmacieTurnoHomeRiepilogo } from "@/components/FarmacieTurnoHomeRiepilogo";
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
import { metadataPagina } from "@/lib/seo";

// SEO/metadata per-pagina (17/11/2026) — vedi lib/seo.ts. La home non
// aveva finora canonical/hreflang/Open Graph/Twitter (solo il <title>
// fisso ereditato dal layout, vedi app/[locale]/layout.tsx) — con
// questa aggiunta li ottiene come ogni altra pagina del sito, senza
// toccare title/description/manifest/icone già impostati dal layout
// (restano quelli, Next.js unisce i campi non ripetuti qui).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/", locale });
}

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
        {/* Ordine dei pannelli (24/11/2026, aggiornato il 17/11/2026) —
            riordinato per chiudere ogni riga della griglia a 3 colonne
            senza buchi grigi vuoti (segnalato dall'utente con
            screenshot: celle vuote dopo "Viabilità"+"Carburanti" e dopo
            "Eventi in regione"). La griglia CSS riempie le righe
            nell'ordine del markup: un pannello a 2 colonne (span={2})
            che non trova più 2 colonne libere nella riga corrente va a
            capo, lasciando vuota la cella che non riesce a occupare.
            Ogni pannello a span={2} (Meteo/Voli/Eventi) è affiancato a
            esattamente un pannello a 1 colonna così da chiudere sempre
            la riga; i pannelli a tutta larghezza (span={3}: Farmacie di
            turno, Carburanti) chiudono sempre una riga da soli, quindi
            possono stare ovunque senza intaccare l'accoppiamento degli
            altri.
            Somma delle "unità" di colonna: 12 pannelli normali (2+1+1+
            1+1+2+1+2+1 = 12) + Farmacie di turno (3) + Carburanti (3) =
            18, esattamente 6 righe da 3 — zero celle vuote. Aggiunto
            "Farmacie di turno" (17/11/2026, richiesto dall'utente: "un
            box in homepage che porti direttamente alle farmacie di
            turno") subito prima di Carburanti invece che in coda:
            servizio di utilità pratica/urgenza, più in vista del dato
            sul prezzo dei carburanti che resta l'ultimo della pagina
            per lo stesso motivo di prima (il pannello "di scorta" meno
            urgente, più tollerabile in fondo). Senza il nuovo pannello
            la somma sarebbe salita a 16 (non divisibile per 3): per
            questo è stato fatto a tutta larghezza invece che a 1
            colonna come BLSD/Allerte/ecc. — stesso esatto ragionamento
            già fatto per Carburanti il 24/11/2026, vedi quel commento
            nella cronologia. */}
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

          <Panel title={t("panels.viabilita")} linkLabel={t("panels.viabilitaLink")} linkHref="https://infoviaggiando.it">
            <ViabilitaPanel />
          </Panel>

          {/* A tutta larghezza (span={3}, 17/11/2026) — vedi il
              commento esteso sopra la griglia per il motivo della
              scelta a tutta larghezza invece che a 1 colonna. Nessun
              linkLabel/linkHref sul Panel: a differenza degli altri
              pannelli con link esterno (quella prop apre sempre in una
              nuova scheda, vedi Panel.tsx), qui il link è interno al
              sito (/farmacie-di-turno) — stesso motivo per cui anche
              BlsdHomeRiepilogo.tsx mette il proprio Link dentro al
              componente invece di usare quella prop. */}
          <Panel title={t("panels.farmacie")} span={3}>
            <FarmacieTurnoHomeRiepilogo />
          </Panel>

          {/* A tutta larghezza (span={3}, 24/11/2026): con tutti gli
              altri 9 pannelli le "unità" di colonna sommano a 12
              (divisibile per 3 solo se questo resta a 1 colonna, con un
              resto di 2 celle vuote in fondo). Portandolo a piena
              larghezza il totale sale a 15, esattamente 5 righe da 3 —
              zero celle vuote in tutta la griglia. Il contenuto
              (3 numeri fissi) è stato adattato per distribuirsi
              sull'intera larghezza, vedi CarburantiPanel.tsx. */}
          <Panel
            title={t("panels.carburanti")}
            linkLabel={t("panels.carburantiLink")}
            linkHref="https://www.mimit.gov.it/it/prezzo-medio-carburanti/regioni"
            span={3}
          >
            <CarburantiPanel />
          </Panel>
        </div>
      </main>

      <Footer extra={<span>{t("fonti")}</span>} />
    </>
  );
}
