"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AriaQualitaPanel } from "@/components/AriaQualitaPanel";
import { BalneazionePanel } from "@/components/BalneazionePanel";
import { FiumePanel } from "@/components/FiumePanel";
import { MarePanel } from "@/components/MarePanel";
import { Panel } from "@/components/Panel";
import { PioggiaPanel } from "@/components/PioggiaPanel";
import { PolliniPanel } from "@/components/PolliniPanel";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { VentoPanel } from "@/components/VentoPanel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

// "Dati ambientali" (11/09/2026, richiesto dall'utente) — nuova pagina
// sotto Ambiente che mostra, un tab-provincia alla volta, gli stessi
// dati ambientali già presenti in homepage (sezione "Ambiente", rimasta
// invariata lì — vedi app/page.tsx). Qui i pannelli condivisi
// (AriaQualitaPanel, PolliniPanel, MarePanel, BalneazionePanel) usano il
// nuovo prop opzionale `provincia` per mostrare un solo valore invece
// della vista aggregata; VentoPanel/PioggiaPanel/FiumePanel già
// supportavano `provincia` (stesso pattern di ProvinciaPage.tsx).
export function DatiAmbientaliPage() {
  const [provincia, setProvincia] = useState<ProvinciaSlug>("trieste");
  const t = useTranslations("datiAmbientali");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/ambiente" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("ambiente")}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">{t("titolo")}</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("descrizione")}</p>

        <div className="flex gap-1.5 flex-wrap mb-6">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => setProvincia(p.slug)}
              aria-pressed={provincia === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                provincia === p.slug
                  ? "bg-cool text-on-accent"
                  : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line">
          <Panel
            title={tHome("ambiente.bora")}
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <VentoPanel provincia={provincia} compatto />
            <div className="border-t border-line my-4" />
            <PioggiaPanel provincia={provincia} compatto />
          </Panel>

          <Panel title={tHome("ambiente.aria")} linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it">
            <AriaQualitaPanel provincia={provincia} />
          </Panel>

          <Panel title={tHome("ambiente.pollini")} linkLabel="ARPA FVG →" linkHref="https://www.arpa.fvg.it/temi/temi/pollini/">
            <PolliniPanel provincia={provincia} />
          </Panel>

          <Panel
            title={tHome("ambiente.livelli")}
            linkLabel="Protezione Civile FVG →"
            linkHref="https://monitor.protezionecivile.fvg.it"
          >
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1.5">{tHome("ambiente.mare")}</p>
            <MarePanel provincia={provincia} />
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1.5 mt-4">{t("fiume")}</p>
            <FiumePanel provincia={provincia} />
          </Panel>

          <Panel
            title={tHome("ambiente.balneazione")}
            linkLabel="ARPA FVG →"
            linkHref="https://www.arpa.fvg.it"
            span={2}
          >
            <BalneazionePanel provincia={provincia} />
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
