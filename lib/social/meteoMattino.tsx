// Modulo "Social" (18/11/2026) — post programmato "Il meteo di oggi"
// (ogni mattina, orario in scripts/social-publish.mjs → PROGRAMMA).
//
// Dati usati, tutti già presenti su Supabase grazie a
// scripts/ingest-light.mjs:
// - snapshot "meteo:previsioni": bollettino OSMER ARPA FVG. Si usa la
//   scadenza "OGGI" (dal blocco "oggi" di meteo.fvg.it, vedi
//   fetchMeteoOggi()); se manca, la scadenza "DOMANI" del bollettino di
//   ieri, che al mattino copre proprio la giornata di oggi.
// - snapshot "aria:pm10": media giornaliera PM10 dell'ultimo giorno
//   misurato (di solito ieri) nei 4 capoluoghi.
//
// Nessun dato real-time di stazione (vincolo delle 24h, vedi commento
// sopra ingestMeteo()): solo previsioni e medie del giorno precedente.

import { COLORI, dataEstesa, escapeHtml, leggiSnapshots, oreDa, troncaTesto } from "./comune";
import type { ContenutoSocial, GeneratoreSocial } from "./tipi";
import { EMOJI_METEO, GEO_BBOX, SAGOMA_BBOX, SAGOMA_FVG, SVG_METEO, type IconaMeteo } from "./risorseMappa";

type ZonaOsmer = { nome: string | null; cielo: string | null; pioggia: string | null; temporale: string | null; nebbia?: string | null };
type PerCitta = { cielo: string | null; pioggia: string | null; temporale: string | null; tmin: string | null; tmax: string | null };
type Scadenza = {
  giorno: "OGGI" | "DOMANI" | "DOPODOMANI" | string;
  data_validita: string | null;
  regione_testo: string | null;
  aggiornamento?: boolean;
  per_citta: Record<string, PerCitta>;
  /** Zone OSMER A1–A9 (aggiunto all'ingestione il 18/11/2026: gli snapshot precedenti non lo hanno). */
  per_zona?: Record<string, ZonaOsmer>;
};
type MeteoPrevisioni = { bollettino_emesso: string | null; scadenze: Scadenza[] };
type Pm10 = {
  data_misura: string;
  soglia_ugm3: number;
  per_provincia: Record<string, { media_giornaliera: number | null; superamento: boolean | null }>;
};

export type DatiMeteoMattino = {
  meteo: MeteoPrevisioni | null;
  meteoAggiornatoIl: string | null;
  pm10: Pm10 | null;
  pm10AggiornatoIl: string | null;
};

const PROVINCE = [
  ["trieste", "Trieste"],
  ["udine", "Udine"],
  ["gorizia", "Gorizia"],
  ["pordenone", "Pordenone"],
] as const;

// ---------------------------------------------------------------------
// Selezione dei dati della giornata
// ---------------------------------------------------------------------

/** true se la stringa (formato data qualsiasi) contiene il numero del giorno. */
function contieneGiorno(s: string | null | undefined, giorno: string): boolean {
  if (!s) return false;
  const g = Number(giorno.slice(8, 10));
  return new RegExp(`(^|\\D)0?${g}(\\D|$)`).test(s);
}

type Selezione = {
  testo: string;
  aggiornamento: boolean;
  pianura: { tmin: string | null; tmax: string | null };
  costa: { tmin: string | null; tmax: string | null };
  /** Icona per capoluogo, null se il bollettino non ha il dettaglio per zona. */
  icone: Partial<Record<PuntoMappa, IconaMeteo>> | null;
};

function selezionaOggi(meteo: MeteoPrevisioni | null, giorno: string): Selezione | null {
  if (!meteo) return null;
  const oggi = meteo.scadenze.find((s) => s.giorno === "OGGI" && contieneGiorno(s.data_validita, giorno));
  const domaniDiIeri = meteo.scadenze.find((s) => s.giorno === "DOMANI" && contieneGiorno(s.data_validita, giorno));
  const s = oggi?.regione_testo ? oggi : domaniDiIeri;
  if (!s?.regione_testo) return null;

  // Il cielo per zona c'è solo nelle scadenze dell'XML OSMER (la "OGGI"
  // presa dall'HTML ha solo testo e temperature): al mattino è la scadenza
  // "DOMANI" del bollettino di ieri, che copre proprio la giornata di oggi.
  const conCielo = [oggi, domaniDiIeri].find((x) => x && CAPOLUOGHI.every((c) => descrizioneZona(x, c)?.cielo));
  let icone: Selezione["icone"] = null;
  if (conCielo) {
    icone = {};
    for (const punto of Object.keys(PUNTI_MAPPA) as PuntoMappa[]) {
      const z = descrizioneZona(conCielo, punto);
      // zone montane assenti negli snapshot precedenti al 18/11/2026: semplicemente non disegnate
      if (z?.cielo) icone[punto] = classificaIcona(z);
    }
  }

  // udine = fascia pianura, trieste = fascia costa (vedi ingestMeteo())
  return {
    testo: s.regione_testo.replace(/^aggiornamento\s*:\s*/i, ""),
    aggiornamento: Boolean(s.aggiornamento),
    pianura: { tmin: s.per_citta.udine?.tmin ?? null, tmax: s.per_citta.udine?.tmax ?? null },
    costa: { tmin: s.per_citta.trieste?.tmin ?? null, tmax: s.per_citta.trieste?.tmax ?? null },
    icone,
  };
}

// ---------------------------------------------------------------------
// Mappa: capoluoghi e icone
// ---------------------------------------------------------------------

/**
 * Punti disegnati sulla mappa, con la zona OSMER da cui prendono il
 * cielo. Le due zone montane sono "Alpi Carniche" (A1) e "Alpi Giulie"
 * (A2): sulla card si chiamano Carnia e Tarvisiano, i nomi con cui sono
 * conosciute; l'icona sta sul centro abitato principale della zona.
 */
const PUNTI_MAPPA = {
  carnia: { nome: "Carnia", zona: "A1", lat: 46.5, lon: 12.92, etichetta: "sotto" },
  tarvisiano: { nome: "Tarvisiano", zona: "A2", lat: 46.47, lon: 13.5, etichetta: "sotto" },
  pordenone: { nome: "Pordenone", zona: "A5", lat: 45.956, lon: 12.66, etichetta: "sotto" },
  udine: { nome: "Udine", zona: "A6", lat: 46.063, lon: 13.235, etichetta: "sotto" },
  gorizia: { nome: "Gorizia", zona: "A7", lat: 45.941, lon: 13.622, etichetta: "sotto" },
  // Lignano e Trieste sono in fondo alla mappa: etichetta a sinistra per non finire sul testo
  lignano: { nome: "Lignano", zona: "A8", lat: 45.677, lon: 13.109, etichetta: "sinistra" },
  trieste: { nome: "Trieste", zona: "A9", lat: 45.65, lon: 13.777, etichetta: "sinistra" },
} as const satisfies Record<string, { nome: string; zona: string; lat: number; lon: number; etichetta: "sotto" | "sinistra" }>;
type PuntoMappa = keyof typeof PUNTI_MAPPA;
const CAPOLUOGHI = ["pordenone", "udine", "gorizia", "trieste"] as const;

/** Descrizione di una zona: da per_zona se c'è, altrimenti (solo capoluoghi) da per_citta. */
function descrizioneZona(s: Scadenza, punto: PuntoMappa): ZonaOsmer | PerCitta | undefined {
  return s.per_zona?.[PUNTI_MAPPA[punto].zona] ?? (punto in s.per_citta ? s.per_citta[punto] : undefined);
}

/**
 * Dalle descrizioni testuali OSMER (cielo / pioggia / temporale) a
 * un'icona. Il vocabolario OSMER non è documentato in modo formale: si
 * cercano parole chiave, dalla condizione più "forte" alla più debole.
 */
export function classificaIcona(z: (Pick<PerCitta, "cielo" | "pioggia" | "temporale"> & { nebbia?: string | null }) | undefined): IconaMeteo {
  const cielo = (z?.cielo ?? "").toLowerCase();
  const pioggia = (z?.pioggia ?? "").toLowerCase();
  const temporale = (z?.temporale ?? "").toLowerCase();
  const assente = (s: string) => !s || /assent|nessun|^no\b|^-$|non previst/.test(s);

  if (!assente(temporale)) return "temporale";
  if (/neve|nevicat|nevischio/.test(pioggia) || /neve|nevicat/.test(cielo)) return "neve";
  if (!assente(pioggia)) {
    const deboleOLocale = /debol|isolat|local|spars|brev|possibil|occasional/.test(pioggia);
    return deboleOLocale && !/copert/.test(cielo) ? "rovesci" : "pioggia";
  }
  // "foschia" (frequente in pianura) non basta per l'icona nebbia: solo nebbia vera
  if (/nebbi/.test(cielo) || /^foschi/.test(cielo) || /nebbi/.test((z?.nebbia ?? "").toLowerCase())) return "nebbia";
  if (/copert/.test(cielo)) return "coperto";
  if (/molto nuvol|^nuvol|\bnuvoloso\b/.test(cielo) && !/poco nuvol/.test(cielo)) return "nuvoloso";
  if (/variab|parzial/.test(cielo)) return "variabile";
  if (/poco nuvol/.test(cielo)) return "poco-nuvoloso";
  if (/seren/.test(cielo)) return "sereno";
  return "variabile";
}

/** Posizione in pixel di una coppia lat/lon dentro la mappa disegnata. */
function proietta(lat: number, lon: number, scala: number, origine: { x: number; y: number }) {
  const x = SAGOMA_BBOX.x0 + ((lon - GEO_BBOX.lon0) / (GEO_BBOX.lon1 - GEO_BBOX.lon0)) * (SAGOMA_BBOX.x1 - SAGOMA_BBOX.x0);
  const y = SAGOMA_BBOX.y0 + ((GEO_BBOX.lat1 - lat) / (GEO_BBOX.lat1 - GEO_BBOX.lat0)) * (SAGOMA_BBOX.y1 - SAGOMA_BBOX.y0);
  return { x: (x - origine.x) * scala, y: (y - origine.y) * scala };
}

/** Il path della sagoma (solo comandi M/L/Z assoluti) portato in pixel. */
function sagomaInPixel(scala: number, origine: { x: number; y: number }): string {
  return SAGOMA_FVG.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x: string, y: string) =>
    `${((Number(x) - origine.x) * scala).toFixed(1)} ${((Number(y) - origine.y) * scala).toFixed(1)}`
  );
}

function rigaIcone(sel: Selezione): string | null {
  if (!sel.icone) return null;
  const icone = sel.icone;
  return (Object.keys(PUNTI_MAPPA) as PuntoMappa[])
    .filter((p) => icone[p])
    .map((p) => `${EMOJI_METEO[icone[p]!]} ${PUNTI_MAPPA[p].nome}`)
    .join(" · ");
}

function gradi(v: string | null): string {
  if (!v || v === "n.d.") return "–";
  return `${v.replace(/\s*°?\s*C?$/i, "")}°`;
}

function righePm10(pm10: Pm10 | null): { nome: string; valore: string; superamento: boolean }[] {
  if (!pm10) return [];
  return PROVINCE.filter(([k]) => pm10.per_provincia[k]?.media_giornaliera != null).map(([k, nome]) => ({
    nome,
    valore: String(Math.round(pm10.per_provincia[k].media_giornaliera as number)),
    superamento: Boolean(pm10.per_provincia[k].superamento),
  }));
}

// ---------------------------------------------------------------------
// Dati di esempio (?demo=1) — per vedere la card senza Supabase
// ---------------------------------------------------------------------

function datiDemo(giorno: string): DatiMeteoMattino {
  const ora = new Date().toISOString();
  return {
    meteoAggiornatoIl: ora,
    pm10AggiornatoIl: ora,
    meteo: {
      bollettino_emesso: giorno,
      scadenze: [
        {
          giorno: "OGGI",
          data_validita: giorno,
          aggiornamento: false,
          regione_testo:
            "Cielo in prevalenza poco nuvoloso con qualche foschia al mattino in pianura. Nel pomeriggio aumento della nuvolosità sui monti, senza precipitazioni. Sulla costa soffierà Bora moderata, a tratti sostenuta a Trieste. Temperature in lieve calo rispetto a ieri.",
          per_citta: {
            pordenone: { cielo: "nuvoloso", pioggia: "debole", temporale: "assente", tmin: "2", tmax: "11" },
            udine: { cielo: "variabile", pioggia: "assente", temporale: "assente", tmin: "2", tmax: "11" },
            gorizia: { cielo: "poco nuvoloso", pioggia: "assente", temporale: "assente", tmin: "2", tmax: "11" },
            trieste: { cielo: "sereno", pioggia: "assente", temporale: "assente", tmin: "7", tmax: "12" },
          },
          per_zona: {
            A1: { nome: "Alpi Carniche", cielo: "nuvoloso", pioggia: "", temporale: "", nebbia: "" },
            A2: { nome: "Alpi Giulie", cielo: "coperto", pioggia: "neve debole", temporale: "", nebbia: "" },
            A5: { nome: "Pordenone", cielo: "nuvoloso", pioggia: "debole", temporale: "", nebbia: "foschia" },
            A6: { nome: "Udine", cielo: "variabile", pioggia: "", temporale: "", nebbia: "" },
            A7: { nome: "Gorizia", cielo: "poco nuvoloso", pioggia: "", temporale: "", nebbia: "" },
            A8: { nome: "Lignano", cielo: "poco nuvoloso", pioggia: "", temporale: "", nebbia: "foschia" },
            A9: { nome: "Trieste", cielo: "sereno", pioggia: "", temporale: "", nebbia: "" },
          },
        },
      ],
    },
    pm10: {
      data_misura: giorno,
      soglia_ugm3: 50,
      per_provincia: {
        trieste: { media_giornaliera: 21, superamento: false },
        udine: { media_giornaliera: 34, superamento: false },
        gorizia: { media_giornaliera: 29, superamento: false },
        pordenone: { media_giornaliera: 56, superamento: true },
      },
    },
  };
}

// ---------------------------------------------------------------------
// Card con la mappa della regione (18/11/2026, richiesta dell'utente)
// ---------------------------------------------------------------------

const etichettaStile = {
  display: "flex",
  fontFamily: "Barlow",
  fontWeight: 600,
  fontSize: "26px",
  letterSpacing: "0.12em",
  color: COLORI.inkDim,
} as const;

function intestazione() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "20px", height: "20px", borderRadius: "999px", backgroundColor: COLORI.cool }} />
        <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "40px", letterSpacing: "0.08em" }}>FVG MONITOR</div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Barlow",
          fontWeight: 600,
          fontSize: "28px",
          letterSpacing: "0.12em",
          color: COLORI.bg,
          backgroundColor: COLORI.cool,
          borderRadius: "8px",
          padding: "6px 16px",
        }}
      >
        METEO
      </div>
    </div>
  );
}

function cardConMappa(
  sel: Selezione,
  pm: { nome: string; valore: string; superamento: boolean }[],
  soglia: number,
  giorno: string
): JSX.Element {
  // Ritaglio della sagoma (unità del path) con un po' di margine per le etichette
  const origine = { x: SAGOMA_BBOX.x0 - 3, y: SAGOMA_BBOX.y0 - 2 };
  const larghezzaVB = SAGOMA_BBOX.x1 - SAGOMA_BBOX.x0 + 8;
  const altezzaVB = SAGOMA_BBOX.y1 - SAGOMA_BBOX.y0 + 4;
  const scala = 6.7;
  const W = Math.round(larghezzaVB * scala);
  const H = Math.round(altezzaVB * scala);
  const ICONA = 104;
  const testo = troncaTesto(sel.testo, 230);

  const boxTemp = (etichetta: string, t: { tmin: string | null; tmax: string | null }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORI.panel,
        border: `2px solid ${COLORI.line}`,
        borderRadius: "20px",
        padding: "22px 28px",
      }}
    >
      <div style={etichettaStile}>{etichetta}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "4px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "24px", color: COLORI.inkFaint }}>MIN</div>
          <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "80px", lineHeight: 1, color: COLORI.cool }}>{gradi(t.tmin)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "24px", color: COLORI.inkFaint }}>MAX</div>
          <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "80px", lineHeight: 1, color: COLORI.warm }}>{gradi(t.tmax)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORI.bg,
        padding: "60px 72px 52px",
        fontFamily: "Newsreader",
        color: COLORI.ink,
      }}
    >
      {intestazione()}

      <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "100px", lineHeight: 1, marginTop: "44px" }}>Il meteo di oggi</div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "12px" }}>
        <div style={{ display: "flex", fontStyle: "italic", fontSize: "44px", color: COLORI.inkDim }}>{dataEstesa(giorno)}</div>
        {sel.aggiornamento && <div style={{ ...etichettaStile, color: COLORI.cool }}>· AGGIORNATO</div>}
      </div>

      {/* Mappa + temperature */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px" }}>
        <div style={{ display: "flex", position: "relative", width: `${W}px`, height: `${H}px` }}>
          {/* Sagoma convertita direttamente in pixel (stessa proiezione delle icone) */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
            <path d={sagomaInPixel(scala, origine)} fill={COLORI.panelAlt} stroke={COLORI.cool} strokeWidth={2.6} strokeLinejoin="round" />
          </svg>
          {(Object.keys(PUNTI_MAPPA) as PuntoMappa[]).filter((c) => sel.icone![c]).map((c) => {
            const { nome, lat, lon, etichetta } = PUNTI_MAPPA[c] as { nome: string; lat: number; lon: number; etichetta: "sotto" | "sinistra" };
            const p = proietta(lat, lon, scala, origine);
            const aSinistra = etichetta === "sinistra";
            return (
              <div
                key={c}
                style={{
                  display: "flex",
                  flexDirection: aSinistra ? "row-reverse" : "column",
                  alignItems: "center",
                  position: "absolute",
                  // con l'etichetta a sinistra il riquadro termina a destra dell'icona
                  left: aSinistra ? `${p.x + ICONA / 2 - 260}px` : `${p.x - 90}px`,
                  top: aSinistra ? `${p.y - ICONA / 2}px` : `${p.y - ICONA / 2 - 10}px`,
                  width: aSinistra ? "260px" : "180px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SVG_METEO[sel.icone![c]!]} width={ICONA} height={ICONA} alt="" />
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Barlow",
                    fontWeight: 600,
                    fontSize: "28px",
                    color: COLORI.ink,
                    backgroundColor: "rgba(14, 37, 41, 0.78)",
                    borderRadius: "8px",
                    padding: "0 10px",
                    marginTop: aSinistra ? "0" : "2px",
                    marginRight: aSinistra ? "4px" : "0",
                  }}
                >
                  {nome}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px", width: "300px" }}>
          {boxTemp("PIANURA", sel.pianura)}
          {boxTemp("COSTA", sel.costa)}
        </div>
      </div>

      {/* Testo del bollettino */}
      <div style={{ display: "flex", fontSize: "33px", lineHeight: 1.36, marginTop: "18px" }}>{testo}</div>

      {/* PM10 */}
      {pm.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "24px" }}>
          <div style={etichettaStile}>{`PM10 DI IERI · µg/m³ · LIMITE ${soglia}`}</div>
          <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
            {pm.map((p) => (
              <div
                key={p.nome}
                style={{
                  display: "flex",
                  flex: 1,
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  backgroundColor: COLORI.panelAlt,
                  borderRadius: "14px",
                  padding: "8px 20px",
                  border: p.superamento ? `3px solid ${COLORI.arancione}` : `3px solid ${COLORI.panelAlt}`,
                }}
              >
                <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "28px", color: COLORI.inkDim }}>{p.nome}</div>
                <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "38px", color: p.superamento ? COLORI.arancione : COLORI.ink }}>
                  {p.valore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: `2px solid ${COLORI.line}`, paddingTop: "18px" }}>
        <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "38px", color: COLORI.cool }}>monitor.fvg.it</div>
        <div style={{ display: "flex", fontSize: "22px", color: COLORI.inkFaint }}>Fonti: OSMER – ARPA FVG · ARPA FVG · Emoji: Twemoji</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Generatore
// ---------------------------------------------------------------------

export const meteoMattino: GeneratoreSocial<DatiMeteoMattino> = {
  tipo: "meteo-mattino",

  async caricaDati({ demo, giorno }) {
    if (demo) return datiDemo(giorno);
    const s = await leggiSnapshots(["meteo:previsioni", "aria:pm10"]);
    return {
      meteo: s["meteo:previsioni"]?.data ?? null,
      meteoAggiornatoIl: s["meteo:previsioni"]?.updated_at ?? null,
      pm10: s["aria:pm10"]?.data ?? null,
      pm10AggiornatoIl: s["aria:pm10"]?.updated_at ?? null,
    };
  },

  contenuto(dati, { giorno, urlSito }): ContenutoSocial {
    const sel = selezionaOggi(dati.meteo, giorno);
    const vuoto = { telegram: "", facebook: "", instagram: "", whatsapp: "" };
    if (!sel) {
      return { tipo: this.tipo, giorno, pronto: false, motivo: "Previsioni OSMER per oggi non ancora disponibili", testi: vuoto };
    }
    if (oreDa(dati.meteoAggiornatoIl) > 6) {
      return { tipo: this.tipo, giorno, pronto: false, motivo: "Snapshot meteo più vecchio di 6 ore (ingestione ferma?)", testi: vuoto };
    }
    // PM10 facoltativo: se è vecchio (>48h) lo si omette invece di bloccare il post
    const pm = oreDa(dati.pm10AggiornatoIl) <= 48 ? righePm10(dati.pm10) : [];
    const soglia = dati.pm10?.soglia_ugm3 ?? 50;

    const data = dataEstesa(giorno);
    const url = `${urlSito}/meteo`;
    const testo = troncaTesto(sel.testo, 520);
    const temp = [
      `🌡️ Pianura: min ${gradi(sel.pianura.tmin)} · max ${gradi(sel.pianura.tmax)}`,
      `🌊 Costa: min ${gradi(sel.costa.tmin)} · max ${gradi(sel.costa.tmax)}`,
    ];
    const rigaPm =
      pm.length > 0
        ? `💨 PM10 ieri (µg/m³, limite ${soglia}): ` + pm.map((p) => `${p.nome} ${p.valore}${p.superamento ? " ⚠️" : ""}`).join(" · ")
        : null;
    const fonti = "Fonti: OSMER – ARPA FVG, ARPA FVG";
    const icone = rigaIcone(sel);

    const telegram = [
      `<b>🌤️ Il meteo di oggi in FVG</b>`,
      `<i>${escapeHtml(data)}</i>`,
      "",
      escapeHtml(testo),
      "",
      ...(icone ? [icone] : []),
      ...temp,
      ...(rigaPm ? ["", escapeHtml(rigaPm)] : []),
      "",
      `👉 <a href="${url}">Tutti i dati su FVG Monitor</a>`,
      `<i>${fonti}</i>`,
    ].join("\n");

    const facebook = [
      `🌤️ Il meteo di oggi in FVG — ${data}`,
      "",
      testo,
      "",
      ...(icone ? [icone] : []),
      ...temp,
      ...(rigaPm ? ["", rigaPm] : []),
      "",
      `👉 Tutti i dati: ${url}`,
      fonti,
    ].join("\n");

    const instagram = [
      `🌤️ Il meteo di oggi in FVG — ${data}`,
      "",
      testo,
      "",
      ...(icone ? [icone] : []),
      ...temp,
      ...(rigaPm ? ["", rigaPm] : []),
      "",
      "👉 Tutti i dati su FVG Monitor: link in bio",
      fonti,
      "",
      "#FVG #FriuliVeneziaGiulia #meteo #meteoFVG #Trieste #Udine #Gorizia #Pordenone",
    ].join("\n");

    const whatsapp = [
      `*🌤️ Il meteo di oggi in FVG*`,
      `_${data}_`,
      "",
      testo,
      "",
      ...(icone ? [icone] : []),
      ...temp,
      ...(rigaPm ? ["", rigaPm] : []),
      "",
      `👉 ${url}`,
      `_${fonti}_`,
    ].join("\n");

    return { tipo: this.tipo, giorno, pronto: true, testi: { telegram, facebook, instagram, whatsapp } };
  },

  card(dati, { giorno }) {
    const sel = selezionaOggi(dati.meteo, giorno);
    const pm = righePm10(dati.pm10);
    const soglia = dati.pm10?.soglia_ugm3 ?? 50;
    // Con il dettaglio per zona: card con la mappa. Altrimenti (es. solo il
    // testo "OGGI" dall'HTML) la versione solo testo + temperature.
    if (sel?.icone) return cardConMappa(sel, pm, soglia, giorno);
    const testo = sel ? troncaTesto(sel.testo, 330) : "Previsioni non ancora disponibili.";

    const boxTemp = (etichetta: string, t: { tmin: string | null; tmax: string | null }) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          backgroundColor: COLORI.panel,
          border: `2px solid ${COLORI.line}`,
          borderRadius: "20px",
          padding: "26px 32px",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 600, fontSize: "30px", letterSpacing: "0.12em", color: COLORI.inkDim }}>
          {etichetta}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "34px", marginTop: "6px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "26px", color: COLORI.inkFaint }}>MIN</div>
            <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "84px", color: COLORI.cool }}>
              {gradi(t.tmin)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "26px", color: COLORI.inkFaint }}>MAX</div>
            <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "84px", color: COLORI.warm }}>
              {gradi(t.tmax)}
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORI.bg,
          padding: "64px 72px 56px",
          fontFamily: "Newsreader",
          color: COLORI.ink,
        }}
      >
        {/* Intestazione */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "999px", backgroundColor: COLORI.cool }} />
            <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "40px", letterSpacing: "0.08em" }}>
              FVG MONITOR
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow",
              fontWeight: 600,
              fontSize: "28px",
              letterSpacing: "0.12em",
              color: COLORI.bg,
              backgroundColor: COLORI.cool,
              borderRadius: "8px",
              padding: "6px 16px",
            }}
          >
            METEO
          </div>
        </div>

        {/* Titolo */}
        <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "112px", lineHeight: 1, marginTop: "56px" }}>
          Il meteo di oggi
        </div>
        <div style={{ display: "flex", fontStyle: "italic", fontSize: "48px", color: COLORI.inkDim, marginTop: "14px" }}>
          {dataEstesa(giorno)}
        </div>
        <div style={{ display: "flex", width: "180px", height: "6px", backgroundColor: COLORI.cool, marginTop: "30px" }} />

        {/* Testo del bollettino */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "34px", minHeight: "330px" }}>
          {sel?.aggiornamento && (
            <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 600, fontSize: "26px", letterSpacing: "0.12em", color: COLORI.cool, marginBottom: "8px" }}>
              AGGIORNAMENTO
            </div>
          )}
          <div style={{ display: "flex", fontSize: "36px", lineHeight: 1.38 }}>{testo}</div>
        </div>

        {/* Temperature */}
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          {boxTemp("PIANURA", sel?.pianura ?? { tmin: null, tmax: null })}
          {boxTemp("COSTA", sel?.costa ?? { tmin: null, tmax: null })}
        </div>

        {/* PM10 */}
        {pm.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "30px" }}>
            <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 600, fontSize: "26px", letterSpacing: "0.12em", color: COLORI.inkDim }}>
              {`PM10 DI IERI · µg/m³ · LIMITE ${soglia}`}
            </div>
            <div style={{ display: "flex", gap: "14px", marginTop: "12px" }}>
              {pm.map((p) => (
                <div
                  key={p.nome}
                  style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    backgroundColor: COLORI.panelAlt,
                    borderRadius: "14px",
                    padding: "12px 20px",
                    border: p.superamento ? `3px solid ${COLORI.arancione}` : `3px solid ${COLORI.panelAlt}`,
                  }}
                >
                  <div style={{ display: "flex", fontFamily: "Barlow", fontSize: "28px", color: COLORI.inkDim }}>{p.nome}</div>
                  <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "40px", color: p.superamento ? COLORI.arancione : COLORI.ink }}>
                    {p.valore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Piè di pagina */}
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: `2px solid ${COLORI.line}`, paddingTop: "22px" }}>
          <div style={{ display: "flex", fontFamily: "Barlow", fontWeight: 700, fontSize: "38px", color: COLORI.cool }}>monitor.fvg.it</div>
          <div style={{ display: "flex", fontSize: "24px", color: COLORI.inkFaint }}>Fonti: OSMER – ARPA FVG · ARPA FVG</div>
        </div>
      </div>
    );
  },
};
