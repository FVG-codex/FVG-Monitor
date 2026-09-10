"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";
import {
  SUPERMERCATI_PER_PROVINCIA,
  CATEGORIE_SUPERMERCATO,
  formattaFasceGiorno,
  giornoSettimana,
  statoAperturaSupermercato,
  adessoEuropeRome,
  type CategoriaSupermercato,
} from "@/lib/supermercati";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

const SupermercatiMap = dynamic(() => import("@/components/SupermercatiMap").then((m) => m.SupermercatiMap), {
  ssr: false,
  loading: () => <p className="text-ink-faint text-sm font-mono">Caricamento mappa…</p>,
});

const CENTRO_PROVINCIA: Record<ProvinciaSlug, [number, number]> = {
  trieste: [45.65, 13.78],
  udine: [46.06, 13.24],
  gorizia: [45.94, 13.62],
  pordenone: [45.96, 12.66],
};

// Pagina "Supermercati" — prima categoria della sezione Commercio
// (10/09/2026). Dato statico fornito dall'utente (vedi commento esteso
// in lib/supermercati.ts per fonte/limiti), non un modulo Supabase: la
// struttura della pagina ricalca comunque FarmaciePage.tsx (tab
// provincia → tab comune → ricerca → elenco/mappa) perché è lo stesso
// bisogno — trovare il punto vendita più vicino — con l'aggiunta di un
// filtro per categoria (Supermercato/Ipermercato/Discount, come i
// filtri di AviazionePage.tsx).
export function SupermercatiPage() {
  const [tab, setTab] = useState<ProvinciaSlug>("trieste");
  const [categoria, setCategoria] = useState<CategoriaSupermercato | "tutte">("tutte");
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
  function selezionaCategoria(c: CategoriaSupermercato | "tutte") {
    setCategoria(c);
    setComuneSel(null);
  }

  const tutteLaProvincia = SUPERMERCATI_PER_PROVINCIA[tab];

  const baseProvincia = useMemo(
    () => (categoria === "tutte" ? tutteLaProvincia : tutteLaProvincia.filter((v) => v.categoria === categoria)),
    [tutteLaProvincia, categoria]
  );

  const comuni = useMemo(() => {
    const conteggio = new Map<string, number>();
    for (const v of baseProvincia) conteggio.set(v.comune, (conteggio.get(v.comune) ?? 0) + 1);
    return Array.from(conteggio.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [baseProvincia]);

  const elenco = useMemo(() => {
    let lista = baseProvincia;
    if (comuneSel) lista = lista.filter((v) => v.comune === comuneSel);
    const q = ricerca.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (v) =>
          v.nome.toLowerCase().includes(q) ||
          v.insegna.toLowerCase().includes(q) ||
          v.comune.toLowerCase().includes(q)
      );
    }
    return lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [baseProvincia, comuneSel, ricerca]);

  function conteggioProvincia(p: ProvinciaSlug): number {
    const lista = SUPERMERCATI_PER_PROVINCIA[p];
    return categoria === "tutte" ? lista.length : lista.filter((v) => v.categoria === categoria).length;
  }

  const nomeProvincia = PROVINCE_LIST.find((p) => p.slug === tab)?.nome ?? tab;
  const giorno = giornoSettimana(adesso);

  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <a href="/commercio" className="text-cool-ink text-xs font-mono hover:underline">
          ← Commercio
        </a>
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1 mt-1">Supermercati</h1>
        <p className="text-ink-faint text-xs font-mono mb-4">
          Supermercati, ipermercati e discount del Friuli Venezia Giulia (minimarket e botteghe esclusi) — dato
          raccolto e verificato manualmente (Google Maps e siti ufficiali delle insegne), non un registro
          ufficiale della Regione. Gli orari indicati sono quelli ordinari settimanali: festività e aperture
          straordinarie non sono incluse.
        </p>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {PROVINCE_LIST.map((p) => (
            <button
              key={p.slug}
              onClick={() => selezionaProvincia(p.slug)}
              aria-pressed={tab === p.slug}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                tab === p.slug ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {p.nome} ({conteggioProvincia(p.slug)})
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => selezionaCategoria("tutte")}
            aria-pressed={categoria === "tutte"}
            className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
              categoria === "tutte" ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            Tutte le categorie
          </button>
          {CATEGORIE_SUPERMERCATO.map((c) => (
            <button
              key={c}
              onClick={() => selezionaCategoria(c)}
              aria-pressed={categoria === c}
              className={`px-3 py-1.5 rounded text-xs font-cond font-semibold uppercase tracking-wide transition-colors ${
                categoria === c ? "bg-cool text-on-accent" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
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
              Tutti i comuni ({baseProvincia.length})
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
          <span className="sr-only">Cerca per nome, insegna o comune</span>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca per nome, insegna o comune…"
            className="w-full max-w-sm px-3 py-1.5 rounded text-sm bg-panel border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-cool"
          />
        </label>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line border border-line">
          <Panel title={`Elenco (${elenco.length})`}>
            {elenco.length === 0 ? (
              <p className="text-ink-faint text-sm font-mono">
                Nessun punto vendita trovato{comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`}.
              </p>
            ) : (
              <div className="max-h-[460px] overflow-y-auto flex flex-col">
                {elenco.map((v, i) => (
                  <div key={v.id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{v.nome}</span>
                      {v.temporaneamenteChiuso ? (
                        <span className="font-mono text-[10px] text-allerta-rossa-ink uppercase shrink-0">
                          Chiuso temporaneamente
                        </span>
                      ) : (
                        <StatoApertoBadge stato={statoAperturaSupermercato(v, adesso)} />
                      )}
                    </div>
                    <div className="text-ink-dim text-xs mt-0.5">
                      {v.categoria} · {v.insegna}
                    </div>
                    <div className="text-ink-dim text-xs mt-0.5">
                      {v.indirizzo}, {v.comune}
                    </div>
                    {v.telefono && (
                      <a href={`tel:${v.telefono.replace(/\s+/g, "")}`} className="text-ink-faint text-xs mt-0.5 block hover:text-cool-ink">
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
                        Oggi: {formattaFasceGiorno(v.orari[giorno])}
                        {v.orariNonVerificati && (
                          <span className="text-ink-faint normal-case"> (orario non confermato)</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Mappa">
            <div
              role="region"
              aria-label={`Mappa dei supermercati${comuneSel ? ` a ${comuneSel}` : ` in provincia di ${nomeProvincia}`} — elenco testuale equivalente nel pannello a fianco`}
              style={{ height: 460 }}
              className="rounded overflow-hidden"
            >
              <SupermercatiMap voci={elenco} centro={CENTRO_PROVINCIA[tab]} adesso={adesso} />
            </div>
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
