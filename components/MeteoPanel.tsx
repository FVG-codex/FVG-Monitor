"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TemperaturaBadge } from "@/components/TemperaturaBadge";
import { ZoneChip } from "@/components/ZoneChip";
import { PROVINCE, PROVINCE_LIST, type ProvinciaSlug } from "@/lib/province";

type Scadenza = {
  giorno: string;
  data_validita: string;
  regione_testo: string | null;
  per_citta: Record<
    ProvinciaSlug,
    { cielo: string | null; pioggia: string | null; temporale: string | null; tmin: string | null; tmax: string | null }
  >;
};

type MeteoData = {
  bollettino_emesso: string;
  situazione_generale: string;
  tendenza: string;
  scadenze: Scadenza[];
  osservazioni_data: string | null;
  ieri: Record<string, { tmin: string | null; tmax: string | null }>;
};

/**
 * Emoji rappresentativa della copertura del cielo, a partire dal testo
 * libero `CIELO_DESCRIZIONE` del bollettino OSMER ARPA FVG (non un codice
 * strutturato — vedi `ingestMeteo()` in `scripts/ingest-light.mjs`, campo
 * `cielo`).
 *
 * Vocabolario verificato via WebFetch su più bollettini reali (30/08,
 * 04/09, 06/09/2026): "sereno", "poco nuvoloso" e "variabile" sono gli
 * unici tre valori osservati nel campione raccolto. "Nuvoloso"/"molto
 * nuvoloso"/"coperto" (terminologia standard dei bollettini meteo
 * italiani, mai osservata direttamente in questo campione, probabilmente
 * per il periodo di tempo stabile in cui è stato raccolto) sono comunque
 * gestiti — riconoscimento per parola chiave contenuta nel testo
 * (case-insensitive), non un elenco fisso di stringhe esatte, per non
 * rompersi al primo giorno di cielo più coperto mai visto nel campione.
 *
 * 4 livelli, dal più sereno al più coperto, sulle 4 emoji scelte
 * dall'utente (06/09/2026): ☀️ sereno, 🌤️ poco nuvoloso, ⛅ variabile/
 * nuvoloso, 🌦️ molto nuvoloso/coperto. Un testo non riconosciuto non
 * mostra alcuna icona (`undefined`) invece di sceglierne una a caso.
 */
export function iconaCielo(cielo: string | null | undefined): string | undefined {
  if (!cielo) return undefined;
  const testo = cielo.toLowerCase();
  if (testo.includes("sereno")) return "☀️";
  if (testo.includes("poco nuvoloso")) return "🌤️";
  if (testo.includes("molto nuvoloso") || testo.includes("coperto")) return "🌦️";
  if (testo.includes("variabile") || testo.includes("nuvoloso") || testo.includes("nubi sparse")) return "⛅";
  return undefined;
}

function useMeteoData() {
  const [dati, setDati] = useState<MeteoData | null>(null);
  const [stato, setStato] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let attivo = true;
    async function carica() {
      const { data, error } = await supabase
        .from("snapshots")
        .select("data")
        .eq("id", "meteo:previsioni")
        .single();
      if (!attivo) return;
      if (error || !data) {
        setStato("error");
        return;
      }
      setDati(data.data as MeteoData);
      setStato("ready");
    }
    carica();
    const id = setInterval(carica, 5 * 60 * 1000);
    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, []);

  return { dati, stato };
}

/**
 * Vista compatta per l'homepage: una riga di sintesi per ciascuna delle
 * 4 province, con link di approfondimento alla pagina dedicata.
 */
export function MeteoOverview() {
  const { dati, stato } = useMeteoData();

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento previsioni…</p>;
  }
  if (stato === "error" || !dati) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        Previsioni non disponibili al momento — riprova più tardi.
      </p>
    );
  }

  const domani = dati.scadenze.find((s) => s.giorno === "DOMANI");

  return (
    <div>
      <p className="font-serif italic text-ink-dim text-sm mb-4">{dati.situazione_generale}</p>
      {domani && (
        <div className="space-y-0">
          {PROVINCE_LIST.map((p, i) => {
            const c = domani.per_citta[p.slug];
            const icona = c ? iconaCielo(c.cielo) : undefined;
            return (
              <a
                key={p.slug}
                href={`/${p.slug}`}
                className={`flex items-center gap-2 sm:gap-3 text-sm py-2.5 ${i > 0 ? "border-t border-line" : ""} hover:bg-panel-alt transition-colors -mx-1 px-1`}
              >
                {/* flex-shrink-0 invece di un min-w fisso su mobile: il
                    nome provincia non deve mai troncarsi (bug segnalato
                    dall'utente su iPhone 16 Pro, 28/08/2026 — la riga non
                    andava mai a capo/si stringeva in modo illeggibile).
                    min-w fisso solo da sm in su, per l'allineamento
                    verticale fra le 4 righe su schermi più larghi. */}
                <span className="font-cond font-semibold flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap sm:min-w-[100px]">
                  {p.nome} <ZoneChip zone={p.zona} />
                </span>
                {c ? (
                  <>
                    {/* min-w-0 + truncate: unico elemento della riga a
                        lunghezza davvero variabile (descrizione cielo,
                        es. "poco nuvoloso") — senza min-w-0 un flex item
                        non si restringe mai sotto la larghezza del suo
                        contenuto (min-width:auto di default), ed è
                        quello che spingeva badge/link fuori dallo
                        schermo su iPhone. Il range di temperatura resta
                        un elemento a sé, mai troncato. L'emoji (06/09/2026)
                        è un `<span>` a sé con `flex-shrink-0`, mai
                        troncabile — solo il testo dopo di essa si accorcia
                        (min-w-0 di nuovo sul suo span interno, stessa
                        lezione flexbox applicata due volte di seguito). */}
                    <span className="text-ink-dim flex-1 min-w-0 flex items-center gap-1.5">
                      {icona && (
                        <span aria-hidden="true" className="flex-shrink-0">
                          {icona}
                        </span>
                      )}
                      <span className="min-w-0 truncate">{c.cielo}</span>
                    </span>
                    {c.tmin && c.tmax && (
                      <span className="font-mono text-ink-faint text-xs flex-shrink-0 whitespace-nowrap">
                        {c.tmin}–{c.tmax}°C
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-ink-faint flex-1 min-w-0 font-mono text-xs">n.d.</span>
                )}
                <TemperaturaBadge provincia={p.slug} />
                {/* "Dettagli" testuale nascosto sotto sm (l'intera riga è
                    già un link, la parola è solo un rinforzo visivo che
                    su telefono stretto costava più spazio di quanto desse
                    valore) — stessa convenzione già in uso in
                    AutobusPanel.tsx/TreniPanel.tsx/VoliPanel.tsx. */}
                <span className="text-cool-ink text-xs font-mono flex-shrink-0 whitespace-nowrap">
                  <span className="hidden sm:inline">Dettagli </span>→
                </span>
              </a>
            );
          })}
        </div>
      )}
      <p className="text-ink-faint text-xs font-mono border-t border-line pt-3 mt-3">
        Bollettino di domani ({domani?.data_validita ?? "—"}) — fonte:{" "}
        <a href="https://www.meteo.fvg.it" target="_blank" rel="noopener noreferrer" className="text-cool-ink">
          OSMER ARPA FVG<span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      </p>
    </div>
  );
}

/**
 * Vista completa per la pagina di una singola provincia: previsioni
 * dettagliate domani/dopodomani + osservazioni di ieri.
 */
export function MeteoDettaglio({ provincia }: { provincia: ProvinciaSlug }) {
  const { dati, stato } = useMeteoData();

  if (stato === "loading") {
    return <p className="text-ink-faint text-sm font-mono">Caricamento previsioni…</p>;
  }
  if (stato === "error" || !dati) {
    return (
      <p className="text-ink-faint text-sm font-mono">
        Previsioni non disponibili al momento — il bollettino OSMER viene aggiornato circa una
        volta al giorno, riprova più tardi.
      </p>
    );
  }

  const nomeCitta = PROVINCE[provincia].nome;
  const ieri = dati.ieri[nomeCitta.toUpperCase()];

  return (
    <div>
      <p className="font-serif italic text-ink-dim text-sm mb-4">{dati.situazione_generale}</p>

      <div className="space-y-4">
        {dati.scadenze.map((s) => {
          const c = s.per_citta[provincia];
          if (!c) return null;
          return (
            <div key={s.giorno} className="border-t border-line pt-3">
              <div className="font-cond font-semibold text-xs uppercase tracking-wide text-ink-faint mb-1.5">
                {s.giorno === "DOMANI" ? "Domani" : "Dopodomani"} ({s.data_validita})
              </div>
              <div className="text-sm text-ink-dim">
                {c.cielo}
                {c.pioggia && `, ${c.pioggia}`}
                {c.temporale && `, ${c.temporale}`}
                {c.tmin && c.tmax && (
                  <span className="font-mono text-ink-faint ml-2">
                    {c.tmin}–{c.tmax}°C
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ieri && (ieri.tmin || ieri.tmax) && (
        <div className="border-t border-line pt-3 mt-4 text-xs font-mono text-ink-faint">
          Ieri ({dati.osservazioni_data}): min {ieri.tmin ?? "n.d."} · max {ieri.tmax ?? "n.d."}
        </div>
      )}

      <p className="text-ink-faint text-xs font-mono border-t border-line pt-3 mt-4">
        Bollettino emesso il {dati.bollettino_emesso} — fonte:{" "}
        <a href="https://www.meteo.fvg.it" target="_blank" rel="noopener noreferrer" className="text-cool-ink">
          OSMER ARPA FVG<span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      </p>
    </div>
  );
}
