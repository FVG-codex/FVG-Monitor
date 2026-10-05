"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import {
  cercaLocalita,
  distanzaKm,
  type ColonnineElettricheData,
  type RisultatoLocalita,
} from "@/lib/colonnineElettriche";

// Pagina "Colonnine elettriche" (03/10/2026, richiesta dall'utente il
// 02/10/2026) — vedi il commento "COLONNINE ELETTRICHE" in
// scripts/ingest-light.mjs per le fonti valutate e i limiti noti del
// dato (OpenChargeMap, comunitario, date di verifica non recenti nel
// campione testato). Pagina dedicata (decisione utente) con selettore
// di posizione sia automatico (geolocalizzazione del browser) sia
// manuale (ricerca testuale, entrambi richiesti dall'utente).
// Raggiungibile da Viabilità (spostata lì da Trasporti il 03/10/2026,
// stesso giorno della prima consegna, su richiesta esplicita
// dell'utente dopo aver visto la pagina in produzione).

const ColonnineElettricheMap = dynamic(
  () => import("@/components/ColonnineElettricheMap").then((m) => m.ColonnineElettricheMap),
  { ssr: false, loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p> }
);

const CENTRO_FVG: [number, number] = [46.1, 13.1];
const RAGGI_KM = [10, 30, 50, 100] as const;

function formattaData(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ColonnineElettrichePage() {
  const [dati, setDati] = useState<ColonnineElettricheData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  const [posizione, setPosizione] = useState<[number, number] | null>(null);
  const [raggioKm, setRaggioKm] = useState<number>(30);
  const [erroreGeo, setErroreGeo] = useState<string | null>(null);
  const [cercandoGeo, setCercandoGeo] = useState(false);

  const [testoRicerca, setTestoRicerca] = useState("");
  const [risultatiRicerca, setRisultatiRicerca] = useState<RisultatoLocalita[]>([]);
  const [cercandoLocalita, setCercandoLocalita] = useState(false);
  const t = useTranslations("colonnineElettriche");
  const tNav = useTranslations("nav");
  const tViabilita = useTranslations("viabilita");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "colonnine-elettriche:fvg")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as ColonnineElettricheData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 15 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  // Ricerca manuale con un piccolo debounce, per non interrogare
  // Nominatim ad ogni tasto premuto.
  useEffect(() => {
    if (testoRicerca.trim().length < 2) {
      setRisultatiRicerca([]);
      return;
    }
    let attivo = true;
    setCercandoLocalita(true);
    const id = setTimeout(async () => {
      const risultati = await cercaLocalita(testoRicerca);
      if (!attivo) return;
      setRisultatiRicerca(risultati);
      setCercandoLocalita(false);
    }, 500);
    return () => {
      attivo = false;
      clearTimeout(id);
    };
  }, [testoRicerca]);

  function usaLaMiaPosizione() {
    setErroreGeo(null);
    if (!navigator.geolocation) {
      setErroreGeo(t("erroreBrowserNonSupportato"));
      return;
    }
    setCercandoGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosizione([pos.coords.latitude, pos.coords.longitude]);
        setCercandoGeo(false);
      },
      (err) => {
        setErroreGeo(
          err.code === err.PERMISSION_DENIED
            ? t("errorePermessoNegato")
            : t("erroreGenerico")
        );
        setCercandoGeo(false);
      },
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  function scegliLocalita(r: RisultatoLocalita) {
    setPosizione([r.lat, r.lon]);
    setRisultatiRicerca([]);
    setTestoRicerca(r.nome);
  }

  const colonnineConDistanza = useMemo(() => {
    const punti = dati?.punti ?? [];
    if (!posizione) return punti.map((c) => ({ ...c, distanzaKm: null as number | null }));
    return punti
      .map((c) => ({ ...c, distanzaKm: distanzaKm(posizione[0], posizione[1], c.lat, c.lon) }))
      .sort((a, b) => (a.distanzaKm ?? 0) - (b.distanzaKm ?? 0));
  }, [dati, posizione]);

  const colonnineVicine = posizione
    ? colonnineConDistanza.filter((c) => (c.distanzaKm ?? Infinity) <= raggioKm)
    : colonnineConDistanza;

  const centroMappa: [number, number] = posizione ?? CENTRO_FVG;

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/viabilita" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("viabilita")}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {tViabilita("colonnineElettriche")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-3">{t("descrizione")}</p>

        <div className="flex flex-wrap items-center gap-2 mb-5 border border-line rounded p-3 bg-panel">
          <button
            onClick={usaLaMiaPosizione}
            disabled={cercandoGeo}
            className="px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide bg-cool text-on-accent hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {cercandoGeo ? t("localizzazione") : t("usaPosizione")}
          </button>

          <div className="relative">
            <input
              type="text"
              value={testoRicerca}
              onChange={(e) => setTestoRicerca(e.target.value)}
              placeholder={t("cercaPlaceholder")}
              className="px-2.5 py-1.5 rounded text-sm border border-line bg-bg w-56"
            />
            {(risultatiRicerca.length > 0 || cercandoLocalita) && (
              <div className="absolute z-10 top-full left-0 mt-1 w-72 max-h-56 overflow-y-auto border border-line rounded bg-panel shadow-lg">
                {cercandoLocalita && <div className="px-2.5 py-1.5 text-xs text-ink-faint font-mono">{t("cercando")}</div>}
                {risultatiRicerca.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => scegliLocalita(r)}
                    className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-bg border-t border-line first:border-t-0"
                  >
                    {r.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1 items-center ml-auto">
            <span className="text-[11px] font-mono text-ink-faint mr-1">{t("raggioLabel")}</span>
            {RAGGI_KM.map((km) => (
              <button
                key={km}
                onClick={() => setRaggioKm(km)}
                aria-pressed={raggioKm === km}
                className={`px-2.5 py-1 rounded text-xs font-cond font-semibold transition-colors ${
                  raggioKm === km ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {erroreGeo && <p className="text-allerta-arancione-ink text-xs font-mono mb-4">{erroreGeo}</p>}

        {stato === "loading" && <p className="text-ink-faint text-sm font-mono">{tChrome("caricamento")}</p>}
        {stato === "error" && <p className="text-ink-faint text-sm font-mono">{tChrome("datiNonDisponibili")}</p>}

        {stato === "ready" && dati && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
            <Panel title={tChrome("mappa")}>
              <div
                role="region"
                aria-label={t("mappaAriaLabel")}
                style={{ height: 460 }}
                className="rounded overflow-hidden"
              >
                <ColonnineElettricheMap
                  colonnine={colonnineVicine}
                  centro={centroMappa}
                  posizione={posizione}
                  raggioKm={raggioKm}
                />
              </div>
            </Panel>

            <Panel
              title={
                posizione
                  ? t("entroRaggio", { km: raggioKm, count: colonnineVicine.length })
                  : t("tutteLeColonnine", { count: colonnineVicine.length })
              }
            >
              {!posizione && (
                <p className="text-ink-dim text-xs mb-3">{t("suggerimentoPosizione")}</p>
              )}
              {colonnineVicine.length === 0 ? (
                <p className="text-ink-faint text-sm font-mono">{t("nessunaColonnina")}</p>
              ) : (
                <div className="max-h-[460px] overflow-y-auto">
                  {colonnineVicine.map((c, i) => (
                    <div key={c.uuid} className={`py-2.5 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-cond font-bold">{c.nome ?? t("colonninaFallback")}</span>
                        {c.distanzaKm !== null && (
                          <span className="font-mono text-[11px] text-ink-faint flex-shrink-0">
                            {c.distanzaKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <div className="text-ink-dim text-xs">
                        {[c.indirizzo, c.comune].filter(Boolean).join(", ") || "—"}
                      </div>
                      <div className="font-mono text-[10px] text-ink-faint mt-0.5">
                        {c.prese.length > 0
                          ? c.prese
                              .map(
                                (p) =>
                                  `${p.tipo ?? t("presaFallback")}${p.potenzaKw ? ` ${p.potenzaKw}kW` : ""} ×${p.quantita}`
                              )
                              .join(" · ")
                          : t("dettaglioPreseNonDisponibile")}
                        {c.verificatoIl
                          ? t("verificato", { data: new Date(c.verificatoIl).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT") })
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {stato === "ready" && dati && (
          <p className="text-ink-faint text-[10px] font-mono mt-3">
            {t("aggiornatoAl", { data: formattaData(dati.aggiornato_al, locale), fonte: dati.fonte })}
          </p>
        )}
      </main>

      <Footer />
    </>
  );
}
