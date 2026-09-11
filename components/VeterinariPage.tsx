"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  VETERINARI_PER_PROVINCIA,
  PROVINCE_VETERINARI_ATTIVE,
  LIVELLO_EMERGENZA,
  vociEmergenza,
  formattaFasceGiornoVet,
  giornoSettimana,
  statoAperturaVeterinario,
  adessoEuropeRome,
} from "@/lib/veterinari";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

const VeterinariMap = dynamic(() => import("@/components/VeterinariMap").then((m) => m.VeterinariMap), {
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
  // Il campo può contenere più numeri separati da "; " (es. due recapiti
  // dello stesso studio) — usato solo il primo per il link tel:, il
  // testo mostrato resta quello completo.
  return telefono.split(";")[0].trim().replace(/\s+/g, "");
}

// Sanità → Veterinari & Emergenze (11/09/2026, vedi commento esteso in
// lib/veterinari.ts). Struttura di pagina ricalcata su
// SupermercatiPage.tsx (tab provincia → tab comune → ricerca →
// elenco/mappa), con un'aggiunta esplicitamente richiesta dall'utente:
// un riquadro "Emergenze" SEMPRE in cima alla pagina (non filtrato per
// comune/ricerca, solo per provincia), messo in risalto con lo stesso
// linguaggio visivo delle allerte del sito (rosso/arancione), perché
// chi cerca questa pagina in un'emergenza reale non deve doverla
// scovare in mezzo all'elenco completo.
export function VeterinariPage() {
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  const [comuneSel, setComuneSel] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const [adesso, setAdesso] = useState(() => adessoEuropeRome());

  useEffect(() => {
    const id = setInterval(() => setAdesso(adessoEuropeRome()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  function selezionaProvincia(p: ProvinciaSlug) {
    setTab(p);
    setComuneSel(null);
  }

  const attiva = PROVINCE_VETERINARI_ATTIVE.includes(tab);
  const tuttaLaProvincia = VETERINARI_PER_PROVINCIA[tab];
  const emergenze = useMemo(() => vociEmergenza(tuttaLaProvincia), [tuttaLaProvincia]);

  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const v of tuttaLaProvincia) conteggio.set(v.comune, (conteggio.get(v.comune) ?? 0) + 1);
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [tuttaLaProvincia]);

  const elenco = useMemo(() => {
    let lista = tuttaLaProvincia;
    if (comuneSel) lista = lista.filter((v) => v.comune === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (v) =>
          v.nome.toLowerCase().includes(q) ||
          v.comune.toLowerCase().includes(q) ||
          v.tipoStruttura.toLowerCase().includes(q)
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
          ← Sanità
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">Veterinari & Emergenze</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Strutture veterinarie del Friuli Venezia Giulia — dato raccolto e verificato manualmente (siti ufficiali
          e directory di settore), non un albo professionale ufficiale. In caso di emergenza, verificare sempre
          telefonicamente la disponibilità reale prima di presentarsi in struttura.
        </p>

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
              {PROVINCE_VETERINARI_ATTIVE.includes(p.slug) ? ` (${VETERINARI_PER_PROVINCIA[p.slug].length})` : " · in arrivo"}
            </button>
          ))}
        </div>

        {!attiva ? (
          <div className="border border-line rounded p-5 bg-panel">
            <p className="text-ink-faint text-sm font-mono">
              Dati veterinari per {nomeProvincia} in arrivo in una prossima fase.
            </p>
          </div>
        ) : (
          <>
            {/* Riquadro Emergenze — sempre visibile, indipendente dai filtri
                comune/ricerca sotto: chi ha un'urgenza deve trovarlo subito,
                senza dover prima azzerare un filtro. */}
            <div className="border-2 border-allerta-rossa rounded p-4 mb-6 bg-panel">
              <h2 className="font-cond font-bold text-lg uppercase tracking-wide text-allerta-rossa-ink mb-1">
                Emergenze · {nomeProvincia}
              </h2>
              {emergenze.length === 0 ? (
                <p className="text-ink-dim text-sm">
                  Nessuna struttura di {nomeProvincia} dichiara una gestione delle emergenze in questo elenco. In
                  caso di urgenza, contattare telefonicamente la struttura più vicina durante l&apos;orario di
                  apertura.
                </p>
              ) : (
                <>
                  <p className="text-ink-faint text-xs font-mono mb-3">
                    Strutture con una gestione delle emergenze dichiarata, dalla più pronta alla meno certa —
                    verificare comunque per telefono prima di un accesso urgente.
                  </p>
                  <div className="flex flex-col gap-3">
                    {emergenze.map((v) => {
                      const livello = LIVELLO_EMERGENZA[v.gestioneEmergenze];
                      const telefonoMostrato = v.telefonoEmergenze ?? v.telefono;
                      return (
                        <div key={v.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{v.nome}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-cond font-bold uppercase tracking-wide ${livello.classeBadge}`}>
                              {livello.etichetta}
                            </span>
                          </div>
                          <div className="text-ink-dim text-xs mt-0.5">
                            {v.tipoStruttura} · {v.indirizzo}, {v.comune}
                          </div>
                          {telefonoMostrato && (
                            <a
                              href={`tel:${telHref(telefonoMostrato)}`}
                              className="inline-block mt-1 text-base font-bold text-allerta-rossa-ink hover:underline"
                            >
                              📞 {telefonoMostrato}
                            </a>
                          )}
                          {v.orariEmergenze && <div className="text-ink-dim text-xs mt-1">{v.orariEmergenze}</div>}
                          {!v.emergenzeVerificate && (
                            <div className="text-ink-faint text-[10px] font-mono uppercase mt-1">
                              Dichiarazione non verificata direttamente — confermare per telefono
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {comuni.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setComuneSel(null)}
                  aria-pressed={comuneSel === null}
                  className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                    comuneSel === null ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  Tutti i comuni ({tuttaLaProvincia.length})
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
              <span className="sr-only">Cerca per nome, comune o tipo di struttura</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca per nome, comune o tipo di struttura…"
                className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
              />
            </label>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
              <Panel title={`Elenco (${elenco.length})`}>
                {elenco.length === 0 ? (
                  <p className="text-ink-faint text-sm font-mono">
                    Nessuna struttura trovata{comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`}.
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto flex flex-col">
                    {elenco.map((v, i) => {
                      const livello = LIVELLO_EMERGENZA[v.gestioneEmergenze];
                      return (
                        <div key={v.id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                          <div className="flex items-baseline justify-between gap-2 min-w-0">
                            <span className="text-sm font-semibold truncate">{v.nome}</span>
                            {v.temporaneamenteChiuso ? (
                              <span className="font-mono text-[10px] text-allerta-rossa-ink uppercase shrink-0">
                                Chiuso temporaneamente
                              </span>
                            ) : (
                              <StatoApertoBadge stato={statoAperturaVeterinario(v, adesso)} />
                            )}
                          </div>
                          <div className="text-ink-dim text-xs mt-0.5">
                            {v.tipoStruttura} · {v.specie}
                          </div>
                          <div className="text-ink-dim text-xs mt-0.5">
                            {v.indirizzo}, {v.comune}
                          </div>
                          {v.telefono && (
                            <a
                              href={`tel:${telHref(v.telefono)}`}
                              className="text-ink-faint text-xs mt-0.5 block hover:text-cool-ink"
                            >
                              Tel. {v.telefono}
                            </a>
                          )}
                          {v.sito && (
                            <a
                              href={v.sito}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-cool-ink hover:underline inline-block mt-0.5"
                            >
                              Sito →<span className="sr-only"> (si apre in una nuova scheda)</span>
                            </a>
                          )}
                          {!v.temporaneamenteChiuso && (
                            <div className="font-mono text-[10px] text-ink-dim mt-1">
                              Oggi: {formattaFasceGiornoVet(v.orari[giorno])}
                              {v.suAppuntamento && <span className="text-ink-faint normal-case"> · su appuntamento</span>}
                            </div>
                          )}
                          <div className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-cond font-bold uppercase tracking-wide ${livello.classeBadge}`}>
                            {livello.etichetta}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel title="Mappa">
                <div
                  role="region"
                  aria-label={`Mappa dei veterinari${comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`} — elenco testuale equivalente nel pannello a fianco`}
                  style={{ height: 460 }}
                  className="rounded overflow-hidden"
                >
                  <VeterinariMap voci={elenco} centro={CENTRO_PROVINCIA[tab]} adesso={adesso} />
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
