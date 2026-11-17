"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { PROVINCE_LIST } from "@/lib/province";
import { type SnapshotFarmacie, diTurnoOggi } from "@/lib/farmacie";

// Homepage → riepilogo Farmacie di turno (17/11/2026, richiesto
// dall'utente: "Vorrei un box in homepage che porti direttamente alle
// farmacie di turno") — stesso pattern già usato per "DAE ·
// Defibrillatori" (BlsdHomeRiepilogo.tsx, vedi lì): solo un conteggio
// per provincia + link alla pagina dedicata /farmacie-di-turno, niente
// elenco farmacie qui (quello resta in FarmaciePage.tsx). A differenza
// del BLSD (conteggio da un file statico, lib/blsd.ts), qui il dato è
// live da Supabase — stessa snapshot "farmacie" già letta da
// FarmaciePage.tsx (vedi lib/farmacie.ts per il formato e la finestra
// dati: solo "oggi", non una tabella oraria permanente), filtrata qui
// allo stesso modo (`diTurnoOggi()`) per contare solo chi ha almeno una
// fascia di turno oggi — stesso identico criterio della pagina
// dedicata, nessuna logica duplicata/divergente.
//
// Portato a tutta larghezza in homepage (span={3}, vedi page.tsx) per
// lo stesso motivo già documentato per CarburantiPanel.tsx: un
// pannello a 1 colonna in più avrebbe rotto la somma delle "unità" di
// griglia (15, divisibile per 3 esatto) lasciando celle vuote a fine
// pagina — a tutta larghezza il totale sale a 18 (ancora divisibile
// per 3, 6 righe piene). I conteggi per provincia si distribuiscono
// sull'intera riga con lo stesso schema `md:justify-between` già usato
// da CarburantiPanel.tsx, invece di restare ammassati a sinistra.
export function FarmacieTurnoHomeRiepilogo() {
  const [dati, setDati] = useState<SnapshotFarmacie | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("home");
  // Stati di caricamento/errore riusati dalla pagina dedicata
  // (namespace "farmacie", chiavi già tradotte nelle 5 lingue) invece
  // di duplicarli come nuove chiavi sotto "home" — stesso principio di
  // riuso già applicato più volte in questo progetto.
  const tFarmacie = useTranslations("farmacie");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase.from("snapshots").select("data").eq("id", "farmacie").single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as SnapshotFarmacie);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000); // stesso intervallo di FarmaciePage.tsx
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">{tFarmacie("caricamentoFarmacie")}</p>;
  }
  if (stato === "error" || !dati) {
    return <p className="text-ink-faint text-sm font-mono">{tFarmacie("nonDisponibili")}</p>;
  }

  const conteggi = PROVINCE_LIST.map((p) => {
    const provincia = dati.per_provincia[p.slug];
    const n = provincia ? provincia.farmacie.filter(diTurnoOggi).length : 0;
    return { ...p, n };
  });
  const totale = conteggi.reduce((acc, c) => acc + c.n, 0);

  return (
    <div>
      <div className="flex gap-10 mb-1 flex-wrap md:justify-between md:gap-6">
        <div>
          <div className="font-cond font-bold text-[36px] leading-[0.9]">{totale}</div>
          <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">{t("farmacieTurno.sottotitolo")}</div>
        </div>
        {conteggi.map((c) => (
          <div key={c.slug}>
            <div className="font-cond font-bold text-[36px] leading-[0.9]">{c.n}</div>
            <div className="font-mono text-[10px] text-ink-faint uppercase mt-1">{c.nome}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center font-mono text-[11px] text-ink-faint border-t border-line pt-3 mt-3">
        <span>{dati.data}</span>
        <Link href="/farmacie-di-turno" className="text-cool-ink hover:underline">
          {t("farmacieTurno.vaiAllaPagina")} →
        </Link>
      </div>
    </div>
  );
}
