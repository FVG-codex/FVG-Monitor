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

export type SnapshotPisteCiclabili = {
  segmenti: SegmentoCiclabile[];
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
};

export function raggruppaPerNome(segmenti: SegmentoCiclabile[]): PercorsoCiclabile[] {
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
    return {
      nome,
      segmenti: segs,
      lunghezzaTotaleM,
      lunghezzaParziale: conLunghezza.length > 0 && conLunghezza.length < segs.length,
    };
  });

  return percorsi.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export function formattaLunghezza(metri: number): string {
  return metri >= 1000 ? `${(metri / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km` : `${Math.round(metri)} m`;
}
