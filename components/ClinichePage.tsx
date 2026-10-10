"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  CLINICHE_PER_PROVINCIA,
  PROVINCE_CLINICHE_ATTIVE,
  formattaFasceGiornoClinica,
  giornoSettimana,
  statoAperturaClinica,
  adessoEuropeRome,
} from "@/lib/cliniche";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

const ClinicheMap = dynamic(() => import("@/components/ClinicheMap").then((m) => m.ClinicheMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

const CENTRO_PROVINCIA: Record<ProvinciaSlug, [number, number]> = {
  trieste: [45.65, 13.78],
  udine: [46.06, 13.24],
  gorizia: [45.94, 13.62],
  pordenone: [45.96, 12.66],
};

function telHref(telefono: string): string {
  // Il campo può contenere più numeri separati da "; " — usato solo il
  // primo per il link tel:, il testo mostrato resta quello completo.
  // Stessa funzione di DentistiPage.tsx/VeterinariPage.tsx.
  return telefono.split(";")[0].trim().replace(/\s+/g, "");
}

// Sanità → Cliniche & centri medici (10/10/2026). Struttura di pagina
// ricalcata su DentistiPage.tsx (tab provincia → tab comune → ricerca →
// elenco/mappa), ma SENZA il riquadro "Emergenze": su richiesta
// esplicita dell'utente, questa sezione non tratta criteri di gestione
// urgenze — vedi il commento esteso in lib/cliniche.ts. Al posto del
// campo "servizi" di Dentisti, qui ogni voce mostra `specialita` (una
// clinica è tipicamente polispecialistica).
export function ClinichePage() {
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const [adesso, setAdesso] = useState(() => adessoEuropeRome());
  const t = useTranslations("cliniche");
  const tNav = useTranslations("nav");
  const tSanita = useTranslations("sanita");
  const tChrome = useTranslations("chrome");
  const tSupermercati = useTranslations("supermercati");

  useEffect(() => {
    const id = setInterval(() => setAdesso(adessoEuropeRome()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }

  const attiva = PROVINCE_CLINICHE_ATTIVE.includes(tab);
  const tuttaLaProvincia = CLINICHE_PER_PROVINCIA[tab];

  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const v of tuttaLaProvincia) conteggio.set(v.comune, (conteggio.get(v.comune) ?? 0) + 1);
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [tuttaLaProvincia]);

  // Stessa logica di centro/zoom mappa di DentistiPage.tsx/VeterinariPage.tsx.
  const centroMappa = useMemo<[number, number]>(() => {
    if (comuneSel) {
      const delComune = tuttaLaProvincia.filter(
        (v): v is typeof v & { lat: number; lon: number } =>
          v.comune === comuneSel && v.lat !== null && v.lon !== null
      );
      if (delComune.length > 0) {
        const lat = delComune.reduce((somma, v) => somma + v.lat, 0) / delComune.length;
        const lon = delComune.reduce((somma, v) => somma + v.lon, 0) / delComune.length;
        return [lat, lon];
      }
    }
    return CENTRO_PROVINCIA[tab];
  }, [tab, comuneSel, tuttaLaProvincia]);
  const zoomMappa = comuneSel ? 13 : 11;

  const elenco = useMemo(() => {
    let lista = tuttaLaProvincia;
    if (comuneSel) lista = lista.filter((v) => v.comune === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (v) =>
          v.nome.toLowerCase().includes(q) ||
          v.comune.toLowerCase().includes(q) ||
          v.tipoStruttura.toLowerCase().includes(q) ||
          v.specialita.some((s) => s.toLowerCase().includes(q))
      );
    }
    return lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [tuttaLaProvincia, comuneSel, ricerca]);

  const nomeProvincia = PROVINCE[tab].nome;
  const giorno = giornoSettimana(adesso);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/sanita" className="text-cool-ink text-xs font-mono hover:underline">
          ← {tNav("sanita")}
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">
          {tSanita("sezioni.cliniche.nome")}
        </h1>
        <p className="text-ink-faint text-xs font-mono mb-4">{t("descrizione")}</p>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => selezionaProvincia(p.slug)}
              aria-pressed={tab === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                tab === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome}
              {PROVINCE_CLINICHE_ATTIVE.includes(p.slug)
                ? ` (${CLINICHE_PER_PROVINCIA[p.slug].length})`
                : ` · ${tChrome("inArrivo")}`}
            </button>
          ))}
        </div>

        {!attiva ? (
          <div className="border border-line rounded p-5 bg-panel">
            <p className="text-ink-faint text-sm font-mono">{t("datiInArrivo", { provincia: nomeProvincia })}</p>
          </div>
        ) : (
          <>
            {comuni.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setComuneSel(null)}
                  aria-pressed={comuneSel === null}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    comuneSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {tChrome("tuttiIComuni", { count: tuttaLaProvincia.length })}
                </button>
                {comuni.map(([c, n]) => (
                  <button
                    key={c}
                    onClick={() => setComuneSel(c)}
                    aria-pressed={comuneSel === c}
                    className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                      comuneSel === c ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                    }`}
                  >
                    {c} ({n})
                  </button>
                ))}
              </div>
            )}

            <label className="block mb-4">
              <span className="sr-only">{t("cercaLabel")}</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder={t("cercaPlaceholder")}
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={tChrome("elenco", { count: elenco.length })}>
                {elenco.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    {t("nessunaStrutturaTrovata", {
                      luogo: comuneSel
                        ? tChrome("aComune", { luogo: comuneSel })
                        : tChrome("inProvinciaDi", { provincia: nomeProvincia }),
                    })}
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {elenco.map((v, i) => (
                      <div key={v.id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{v.nome}</span>
                          {v.temporaneamenteChiuso ? (
                            <span className="font-mono text-[10px] text-allerta-rossa-ink uppercase shrink-0">
                              {tSupermercati("chiusoTemporaneamente")}
                            </span>
                          ) : (
                            <StatoApertoBadge stato={statoAperturaClinica(v, adesso)} />
                          )}
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5">
                          {v.tipoStruttura}
                          {v.convenzionataSsr && <span className="text-cool-ink"> · {t("convenzionataSsr")}</span>}
                        </div>
                        <div className="text-ink-dim text-xs mt-0.5">
                          {v.indirizzo}, {v.comune}
                        </div>
                        {v.telefono && (
                          <a
                            href={`tel:${telHref(v.telefono)}`}
                            className="text-ink-faint text-xs mt-0.5 block hover:text-cool-ink"
                          >
                            {tChrome("telEtichetta", { telefono: v.telefono })}
                          </a>
                        )}
                        {v.sito && (
                          <a
                            href={v.sito}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-cool-ink hover:underline inline-block mt-0.5"
                          >
                            {tChrome("sitoLink")}
                            <span className="sr-only"> {tChrome("apreNuovaScheda")}</span>
                          </a>
                        )}
                        {!v.temporaneamenteChiuso && (
                          <div className="font-mono text-[10px] text-ink-dim mt-1">
                            {tSupermercati("oggiOrari", {
                              orari: formattaFasceGiornoClinica(
                                v.orari[giorno],
                                t("orarioNonPubblicato"),
                                t("chiuso")
                              ),
                            })}
                            {v.suAppuntamento && (
                              <span className="text-ink-faint normal-case"> · {t("suAppuntamento")}</span>
                            )}
                          </div>
                        )}
                        {v.specialita.length > 0 && (
                          <div className="text-ink-faint text-[10px] mt-1">
                            {t("specialitaLabel")} {v.specialita.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title={tChrome("mappa")}>
                <div
                  role="region"
                  aria-label={t("mappaAriaLabel", {
                    luogo: comuneSel
                      ? tChrome("aComune", { luogo: comuneSel })
                      : tChrome("inProvinciaDi", { provincia: nomeProvincia }),
                  })}
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <ClinicheMap voci={elenco} centro={centroMappa} zoom={zoomMappa} adesso={adesso} />
                </div>
              </Panel>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
