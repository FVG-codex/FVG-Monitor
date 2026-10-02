"use client";

import { useEffect, useMemo, useState } from "react";

// Grafico "Andamento di oggi" (02/10/2026) — un unico grafico con le 3
// stazioni sovrapposte (decisione utente), tratto continuo = osservato
// (API PC FVG, fino ad "adesso"), tratteggiato = previsione (FCGON di
// tide-forecast.com, per il resto della giornata) — stessa distinzione
// già fatta a parole nei due blocchi separati più sotto in MareePage.tsx,
// qui mostrata in forma visiva. Palette e specifiche dei tratti seguite
// dalla skill "dataviz" di questa sessione (ordine fisso dei colori,
// legenda sempre presente con etichette testuali — non solo colore —
// perché 2 dei 3 colori non raggiungono 3:1 di contrasto sullo sfondo
// chiaro, vedi commento su --color-serie-* in globals.css), adattata ai
// token di colore già esistenti del sito invece di una palette nuova.
//
// Nessuna libreria di grafici aggiunta (il progetto non ne usa già
// nessuna): SVG scritto a mano, stesso principio "poche dipendenze" già
// seguito ovunque in questo progetto.

type PuntoSerie = { ora: string; altezza_m: number };

type DatiOsservati = { serie?: PuntoSerie[] };
type DatiPrevisti = { serieOggi?: PuntoSerie[] };

const STAZIONI_GRAFICO = [
  { slug: "trieste", nome: "Trieste", classeStroke: "stroke-serie-trieste", classeFill: "fill-serie-trieste" },
  { slug: "grado", nome: "Grado", classeStroke: "stroke-serie-grado", classeFill: "fill-serie-grado" },
  { slug: "lignano", nome: "Lignano", classeStroke: "stroke-serie-lignano", classeFill: "fill-serie-lignano" },
] as const;

const LARGHEZZA = 760;
const ALTEZZA = 230;
const MARGINE = { top: 14, right: 14, bottom: 26, left: 34 };
const LARGHEZZA_INTERNA = LARGHEZZA - MARGINE.left - MARGINE.right;
const ALTEZZA_INTERNA = ALTEZZA - MARGINE.top - MARGINE.bottom;

type Punto = { t: number; v: number };

function aPuntiOrdinati(punti: PuntoSerie[] | undefined): Punto[] {
  return (punti ?? [])
    .map((p) => ({ t: new Date(p.ora).getTime(), v: p.altezza_m }))
    .filter((p) => !Number.isNaN(p.t))
    .sort((a, b) => a.t - b.t);
}

// Interpola linearmente il valore di una serie di punti (ordinata per
// tempo) all'istante `t` — usato solo per il tooltip al passaggio del
// mouse, per leggere un valore anche tra due campioni reali (coerente
// con la linea disegnata, che è anch'essa un'interpolazione lineare tra
// i punti).
function interpola(punti: Punto[], t: number): number | null {
  if (punti.length === 0) return null;
  if (t <= punti[0].t) return punti[0].v;
  if (t >= punti[punti.length - 1].t) return punti[punti.length - 1].v;
  for (let i = 1; i < punti.length; i++) {
    if (punti[i].t >= t) {
      const a = punti[i - 1];
      const b = punti[i];
      const frazione = (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * frazione;
    }
  }
  return null;
}

function formattaOraAsse(t: number): string {
  return new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

// Passo "carino" per le linee guida orizzontali (altezza in metri),
// scelto in modo che ci siano circa 4-7 linee sull'intervallo dato.
function passoCarino(intervallo: number): number {
  const candidati = [0.1, 0.2, 0.25, 0.5, 1];
  for (const c of candidati) {
    if (intervallo / c <= 7) return c;
  }
  return 1;
}

export function MareeGraficoOggi({
  osservate,
  previste,
}: {
  osservate: Partial<Record<string, DatiOsservati>>;
  previste: Partial<Record<string, DatiPrevisti>>;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  // "adesso" letto con Date.now() DIRETTAMENTE nel render (invece che in
  // questo stato) avrebbe causato un mismatch di idratazione: il render
  // lato server e quello lato client avvengono in due istanti diversi,
  // quindi la riga/posizione calcolata risulterebbe leggermente diversa
  // tra i due — confermato con un rendering di prova via Chromium
  // headless (differenza di pochi millisecondi sulla coordinata X,
  // avviso "Prop did not match" in console). Null al primo render (niente
  // riga "adesso" finché non si è montati lato client — nessun dato è
  // comunque disponibile prima di allora, la pagina che usa questo
  // componente carica da Supabase solo dopo il mount), poi aggiornato ogni
  // minuto.
  const [adesso, setAdesso] = useState<number | null>(null);
  useEffect(() => {
    setAdesso(Date.now());
    const id = setInterval(() => setAdesso(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const datiPerStazione = useMemo(
    () =>
      STAZIONI_GRAFICO.map((s) => ({
        ...s,
        osservati: aPuntiOrdinati(osservate[s.slug]?.serie),
        previsti: aPuntiOrdinati(previste[s.slug]?.serieOggi),
      })),
    [osservate, previste]
  );

  // Dominio dell'asse X: l'intera giornata coperta dalla previsione
  // (24h circa, dalla prima stazione che ha dati) — l'osservato copre
  // solo da mezzanotte ad "adesso", quindi da solo non basterebbe a
  // mostrare "il giorno in corso" per intero.
  const stazioneConPrevisione = datiPerStazione.find((s) => s.previsti.length > 0);
  const xMin = stazioneConPrevisione?.previsti[0]?.t;
  const xMax = stazioneConPrevisione?.previsti[stazioneConPrevisione.previsti.length - 1]?.t;

  const haDati = xMin !== undefined && xMax !== undefined && xMax > xMin;

  const serieComplete = useMemo(() => {
    if (!haDati) return [];
    return datiPerStazione.map((s) => {
      const osservatiNelGiorno = s.osservati.filter((p) => p.t >= xMin! && p.t <= xMax!);
      const previstiNelGiorno = s.previsti.filter((p) => p.t >= xMin! && p.t <= xMax!);
      const ultimoOsservato = osservatiNelGiorno[osservatiNelGiorno.length - 1] ?? null;
      // Il tratto tratteggiato riparte esattamente dall'ultimo punto
      // osservato (se c'è), così la linea resta continua nel punto di
      // passaggio invece di lasciare un salto — il resto è previsione.
      const previstiDopo = previstiNelGiorno.filter((p) => p.t > (ultimoOsservato?.t ?? -Infinity));
      const tratteggiato = ultimoOsservato ? [ultimoOsservato, ...previstiDopo] : previstiNelGiorno;
      return { ...s, continuo: osservatiNelGiorno, tratteggiato, puntoAdesso: ultimoOsservato };
    });
  }, [datiPerStazione, haDati, xMin, xMax]);

  if (!haDati || serieComplete.every((s) => s.continuo.length === 0 && s.tratteggiato.length === 0)) {
    return <p className="font-mono text-xs text-ink-faint">Grafico non disponibile al momento.</p>;
  }

  const tuttiIValori = serieComplete.flatMap((s) => [...s.continuo, ...s.tratteggiato].map((p) => p.v));
  const yMinDati = Math.min(...tuttiIValori);
  const yMaxDati = Math.max(...tuttiIValori);
  const paddingY = Math.max((yMaxDati - yMinDati) * 0.12, 0.05);
  const yMin = yMinDati - paddingY;
  const yMax = yMaxDati + paddingY;
  const passo = passoCarino(yMax - yMin);
  const primaLineaY = Math.ceil(yMin / passo) * passo;
  const lineeY: number[] = [];
  for (let v = primaLineaY; v <= yMax; v += passo) lineeY.push(Math.round(v * 100) / 100);

  const x = (t: number) => MARGINE.left + ((t - xMin!) / (xMax! - xMin!)) * LARGHEZZA_INTERNA;
  const y = (v: number) => MARGINE.top + ALTEZZA_INTERNA - ((v - yMin) / (yMax - yMin)) * ALTEZZA_INTERNA;

  function tracciato(punti: Punto[]): string {
    return punti.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  }

  // Tacche asse X ogni 3 ore, agganciate a ore "intere" nel fuso di Roma
  // (non a frazioni del dominio) — più leggibili di tacche equidistanti
  // ma su orari qualsiasi.
  const tacche: number[] = [];
  for (let t = xMin!; t <= xMax!; t += 30 * 60_000) {
    const minutiRoma = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", hour: "numeric", hour12: false }).format(t)
    );
    if (minutiRoma % 3 === 0) {
      const vicinoAEsistente = tacche.some((tExistente) => Math.abs(tExistente - t) < 90 * 60_000);
      if (!vicinoAEsistente) tacche.push(t);
    }
  }

  const xHover = hoverX !== null ? MARGINE.left + Math.min(Math.max(hoverX, 0), LARGHEZZA_INTERNA) : null;
  const tHover = xHover !== null ? xMin! + ((xHover - MARGINE.left) / LARGHEZZA_INTERNA) * (xMax! - xMin!) : null;

  return (
    <div>
      <div
        role="img"
        aria-label="Andamento del livello del mare oggi a Trieste, Grado e Lignano — valori numerici nei pannelli sotto"
        className="relative"
      >
        <svg
          viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
          className="w-full h-auto"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xSvg = ((e.clientX - rect.left) / rect.width) * LARGHEZZA;
            setHoverX(xSvg - MARGINE.left);
          }}
          onPointerLeave={() => setHoverX(null)}
        >
          {/* Linee guida orizzontali (altezza) */}
          {lineeY.map((v) => (
            <g key={v}>
              <line
                x1={MARGINE.left}
                x2={LARGHEZZA - MARGINE.right}
                y1={y(v)}
                y2={y(v)}
                className="stroke-line"
                strokeWidth={1}
              />
              <text x={MARGINE.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-ink-faint text-[9px] font-mono">
                {v > 0 ? "+" : ""}
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Asse X */}
          {tacche.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={MARGINE.top} y2={ALTEZZA - MARGINE.bottom} className="stroke-line" strokeWidth={1} opacity={0.5} />
              <text x={x(t)} y={ALTEZZA - MARGINE.bottom + 14} textAnchor="middle" className="fill-ink-faint text-[9px] font-mono">
                {formattaOraAsse(t)}
              </text>
            </g>
          ))}

          {/* Linea "adesso" */}
          {adesso !== null && adesso >= xMin! && adesso <= xMax! && (
            <line
              x1={x(adesso)}
              x2={x(adesso)}
              y1={MARGINE.top}
              y2={ALTEZZA - MARGINE.bottom}
              className="stroke-ink-faint"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          {/* Le 3 serie */}
          {serieComplete.map((s) => (
            <g key={s.slug}>
              {s.tratteggiato.length > 1 && (
                <path d={tracciato(s.tratteggiato)} fill="none" className={s.classeStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" opacity={0.85} />
              )}
              {s.continuo.length > 1 && (
                <path d={tracciato(s.continuo)} fill="none" className={s.classeStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              )}
              {s.puntoAdesso && (
                <circle cx={x(s.puntoAdesso.t)} cy={y(s.puntoAdesso.v)} r={4} className={s.classeFill} stroke="rgb(var(--color-panel))" strokeWidth={2} />
              )}
            </g>
          ))}

          {/* Crosshair al passaggio del mouse/tocco */}
          {tHover !== null && tHover >= xMin! && tHover <= xMax! && (
            <line x1={x(tHover)} x2={x(tHover)} y1={MARGINE.top} y2={ALTEZZA - MARGINE.bottom} className="stroke-ink-faint" strokeWidth={1} />
          )}
        </svg>

        {/* Tooltip */}
        {tHover !== null && tHover >= xMin! && tHover <= xMax! && (
          <div
            className="absolute top-1 bg-panel-alt border border-line rounded px-2 py-1.5 font-mono text-[10px] pointer-events-none"
            style={{
              left: `${Math.min(Math.max((x(tHover) / LARGHEZZA) * 100, 14), 86)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-ink-faint mb-0.5">{formattaOraAsse(tHover)}</div>
            {serieComplete.map((s) => {
              const tutti = [...s.continuo, ...s.tratteggiato];
              const valore = interpola(tutti, tHover);
              if (valore === null) return null;
              return (
                <div key={s.slug} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${s.classeFill}`} />
                  <span className="text-ink-dim">{s.nome}</span>
                  <span className="text-ink font-bold ml-auto">
                    {valore > 0 ? "+" : ""}
                    {valore.toFixed(2)} m
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {STAZIONI_GRAFICO.map((s) => (
          <div key={s.slug} className="flex items-center gap-1.5 font-mono text-[10px] text-ink-dim">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.classeFill}`} />
            {s.nome}
          </div>
        ))}
        <div className="font-mono text-[10px] text-ink-faint ml-auto">tratto continuo = osservato · tratteggiato = previsione</div>
      </div>
    </div>
  );
}
