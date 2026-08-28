import type { ProvinciaSlug } from "@/lib/province";

// Piste Ciclabili — dataset Socrata "Piste Ciclabili" (7eat-pecq) su
// dati.friuliveneziagiulia.it. Vedi ingestPisteCiclabili() in
// scripts/ingest-light.mjs per la ricognizione completa fatta il
// 27/08/2026 e le note importanti sui limiti del dato — riassunto:
//
// - COPERTURA PARZIALE: solo i tracciati che i Comuni hanno trasmesso
//   alla Regione in una specifica procedura urbanistica ("conformazione
//   al PRGC"), non un censimento completo della rete ciclabile regionale
//   — bounding box reale concentrato in un'area centrale (Udine/Gorizia),
//   NON copre Trieste né l'estremo ovest di Pordenone né la fascia alpina.
// - Ogni PERCORSO con nome è diviso in più SEGMENTI (486 righe, solo 36
//   nomi distinti) — l'elenco va raggruppato per nome, non per riga.
// - `lunghezzaM` manca per alcuni segmenti — la somma per percorso può
//   quindi essere una sottostima quando accade.
// - Comune di partenza/arrivo e provincia (27/08/2026, richiesti
//   dall'utente): via reverse geocoding Nominatim sui due punti estremi
//   del percorso, calcolato in ingestione (vedi arricchisciPisteCiclabili
//   ConGeocoding() in scripts/ingest-light.mjs) — "quando possibile":
//   Nominatim può non restituire un nome di località per un punto isolato
//   (resta `null`), e per un percorso a più segmenti "partenza"/"arrivo"
//   sono un'approssimazione (primo/ultimo punto nell'ORDINE della fonte,
//   non un itinerario continuo verificato) — segnalato con
//   `partenzaArrivoApprossimati`.

export type SegmentoCiclabile = {
  id: number | null;
  nome: string;
  lunghezzaM: number | null;
  livello: string | null;
  origineDa: string | null;
  sigla: string | null;
  // Una MultiLineString può contenere più linee separate — ciascuna è un
  // array di coppie [lat, lon] (già invertite da [lon, lat] in
  // ingestione, pronte per <Polyline positions={...} /> di react-leaflet).
  linee: [number, number][][];
};

export type ArricchimentoPercorso = {
  comunePartenza: string | null;
  comuneArrivo: string | null;
  provincia: ProvinciaSlug | null;
};

export type SnapshotPisteCiclabili = {
  segmenti: SegmentoCiclabile[];
  // Chiave: nome del percorso — vedi ArricchimentoPercorso sopra. Può
  // essere parziale (non tutti i percorsi sono ancora stati
  // geocodificati, il backfill è incrementale) o del tutto assente se il
  // geocoding è fallito per intero in ogni esecuzione finora.
  arricchimento?: Record<string, ArricchimentoPercorso>;
  aggiornato_al: string; // ISO
};

// Un "percorso" nominato può comparire come più righe/segmenti separati
// nella fonte (vedi nota sopra) — raggruppati qui per nome, non in
// ingestione, cosi la UI ha sia il dettaglio per segmento (mappa) sia il
// riepilogo per percorso (elenco), senza due letture della snapshot.
export type PercorsoCiclabile = {
  nome: string;
  segmenti: SegmentoCiclabile[];
  lunghezzaTotaleM: number | null; // null se NESSUN segmento ha una lunghezza nota
  lunghezzaParziale: boolean; // true se solo alcuni segmenti hanno lunghezza nota
  comunePartenza: string | null;
  comuneArrivo: string | null;
  provincia: ProvinciaSlug | null;
  // true quando il percorso ha più di un segmento — "partenza"/"arrivo"
  // sono allora un'approssimazione (vedi nota sopra), non un itinerario
  // continuo verificato.
  partenzaArrivoApprossimati: boolean;
};

export function raggruppaPerNome(
  segmenti: SegmentoCiclabile[],
  arricchimento: Record<string, ArricchimentoPercorso> = {}
): PercorsoCiclabile[] {
  const perNome = new Map<string, SegmentoCiclabile[]>();
  for (const s of segmenti) {
    const lista = perNome.get(s.nome) ?? [];
    lista.push(s);
    perNome.set(s.nome, lista);
  }

  const percorsi: PercorsoCiclabile[] = Array.from(perNome.entries()).map(([nome, segs]) => {
    const conLunghezza = segs.filter((s) => s.lunghezzaM !== null);
    const lunghezzaTotaleM =
      conLunghezza.length === 0 ? null : conLunghezza.reduce((tot, s) => tot + (s.lunghezzaM ?? 0), 0);
    const arr = arricchimento[nome];
    return {
      nome,
      segmenti: segs,
      lunghezzaTotaleM,
      lunghezzaParziale: conLunghezza.length > 0 && conLunghezza.length < segs.length,
      comunePartenza: arr?.comunePartenza ?? null,
      comuneArrivo: arr?.comuneArrivo ?? null,
      provincia: arr?.provincia ?? null,
      partenzaArrivoApprossimati: segs.length > 1,
    };
  });

  return percorsi.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export function formattaLunghezza(metri: number): string {
  return metri >= 1000 ? `${(metri / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km` : `${Math.round(metri)} m`;
}

// Etichetta "Da X a Y" per il pannello elenco — gestisce ogni
// combinazione possibile di comune noto/sconosciuto ("quando possibile",
// richiesto dall'utente): entrambi noti e diversi, entrambi noti e
// uguali (percorso ad anello), solo uno noto, o nessuno (geocoding non
// ancora arrivato a questo percorso, o fallito per questo punto).
export function etichettaPartenzaArrivo(p: PercorsoCiclabile): string | null {
  const { comunePartenza: da, comuneArrivo: a } = p;
  if (da && a) return da === a ? da : `Da ${da} a ${a}`;
  if (da) return `Da ${da}`;
  if (a) return `Fino a ${a}`;
  return null;
}

// -----------------------------------------------------------------------
// Seconda fonte: turismofvg.it/it/bike, serie R (percorsi ad anello) —
// aggiunta il 28/08/2026 su richiesta dell'utente, come SECONDA fonte
// nella stessa pagina (non un merge con i dati Regione: sono cataloghi
// diversi, senza corrispondenza 1:1 fra le voci — vedi ricognizione in
// claude/fvgmonitor-stato.md). A differenza del dataset Regione, qui
// ogni percorso ha già un tracciato completo (non frammentato) e dati
// tecnici ricchi (km, dislivelli, difficoltà, durata) letti dal blocco
// JSON-LD della scheda di dettaglio (vedi ingestTurismoFvgBike() in
// scripts/ingest-light.mjs) — comuni attraversati letti dalla pagina
// elenco (o-card__locality), provincia derivata da quei comuni con
// lib/comuniFvg.ts (nessun geocoding necessario per questa fonte).
export type PuntoNominato = { nome: string; lat: number; lon: number };

export type PercorsoTurismoFvgBike = {
  id: number; // id interno Outdooractive (per i link GPX/KML/FIT)
  codice: string; // es. "R001"
  nome: string; // senza il codice tra parentesi
  url: string; // pagina di dettaglio su turismofvg.it
  comuni: string[]; // comuni attraversati, dalla pagina elenco
  provincia: ProvinciaSlug | null; // derivata da `comuni`, vedi lib/comuniFvg.ts
  lunghezzaM: number | null;
  dislivelloSalitaM: number | null;
  dislivelloDiscesaM: number | null;
  quotaMinM: number | null;
  quotaMaxM: number | null;
  durataMin: number | null;
  difficolta: string | null; // etichetta italiana così come mostrata dal sito (es. "media")
  anello: boolean;
  partenza: PuntoNominato | null;
  arrivo: PuntoNominato | null;
  // Tracciato completo (non frammentato, a differenza della fonte
  // Regione) — array di segmenti di linea, ciascuno [lat,lon][], stesso
  // formato di SegmentoCiclabile.linee per riuso diretto nella mappa.
  linee: [number, number][][];
  caratteristiche: string[]; // es. "E-bike", "Panoramico" — elenco libero, non fisso
  gpxUrl: string | null;
  kmlUrl: string | null;
  fitUrl: string | null;
  aggiornatoAl: string; // ISO, quando la scheda di dettaglio è stata letta
};

export type SnapshotPisteCiclabiliTurismoFvg = {
  // Indice di tutti i percorsi della serie visti sulla pagina elenco
  // (id/codice/nome/url/comuni), sempre aggiornato ad ogni esecuzione.
  indice: { id: number; codice: string; nome: string; url: string; comuni: string[] }[];
  // Schede di dettaglio già scaricate, indicizzate per id — backfill
  // incrementale (vedi TURISMOFVG_BIKE_MAX_NUOVE_SCHEDE_PER_ESECUZIONE in
  // scripts/ingest-light.mjs), quindi può essere parziale finché tutta
  // la serie non è stata scaricata almeno una volta.
  dettagli: Record<number, PercorsoTurismoFvgBike>;
  aggiornato_al: string; // ISO
};

// Le 4 serie con codice di turismofvg.it/it/bike (28/08/2026) — un box
// separato in UI per ciascuna (richiesto esplicitamente dall'utente,
// invece dei due gruppi dentro un unico Elenco della prima versione),
// più "regione" per i dati Regione FVG (ultimo box, fonte diversa/più
// datata — vedi PisteCiclabiliPage.tsx). Duplicato concettualmente da
// TURISMOFVG_BIKE_SERIE in scripts/ingest-light.mjs (stesso vincolo
// TS/JS già noto in questo progetto — vedi lib/comuniFvg.ts), qui solo
// per etichette/id snapshot lato UI, non per la logica di scraping.
export const SERIE_TURISMOFVG_BIKE: {
  chiave: "r" | "p" | "c" | "m";
  etichetta: string;
  idSnapshot: string;
}[] = [
  { chiave: "r", etichetta: "Anelli", idSnapshot: "piste-ciclabili-turismofvg-r" },
  { chiave: "p", etichetta: "Percorsi lineari", idSnapshot: "piste-ciclabili-turismofvg-p" },
  { chiave: "c", etichetta: "Ciclovie a tappe", idSnapshot: "piste-ciclabili-turismofvg-c" },
  { chiave: "m", etichetta: "Mountain bike", idSnapshot: "piste-ciclabili-turismofvg-m" },
];

export function formattaDurata(minuti: number): string {
  const h = Math.floor(minuti / 60);
  const m = Math.round(minuti % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h}:${String(m).padStart(2, "0")} h`;
}
