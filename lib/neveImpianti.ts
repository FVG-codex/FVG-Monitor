// Turismo → Neve & Impianti (16/09/2026). Vedi il commento esteso sopra
// ingestNeveImpianti() in scripts/ingest-light.mjs per la fonte, il
// metodo di verifica e i due bug reali trovati e corretti nello script
// Python di partenza fornito dall'utente (generato con ChatGPT, non
// eseguito direttamente per questo motivo).
//
// Dati anagrafici statici (altitudine, km piste, numero impianti) presi
// dal pacchetto dell'utente, a sua volta ricavato da pagine ufficiali
// PromoTurismoFVG/TurismoFVG — con UNA correzione: Sappada/Forni Avoltri
// era indicato con 9 impianti, ma la striscia riepilogativa live della
// fonte mostra un totale di 8 (`impianti aperti 0/8`, verificato più
// volte il 16/09/2026) — corretto qui a 8, e tappeti da "non
// dichiarato" a 0 (coerente con `tappeti aperti 0/0` osservato).

export type StatoImpianti = "aperto" | "parziale" | "chiuso" | "sconosciuto";

export type ComprensorioStatico = {
  slug: string;
  nome: string;
  gruppoUfficiale: string;
  comune: string;
  provincia: string | null;
  altitudineMinM: number | null;
  altitudineMaxM: number | null;
  dislivelloSciabileM: number | null;
  downhillKm: number | null;
  fondoKm: number | null;
  innevamentoProgrammatoPct: number | null;
  impiantiCount: number;
  tappetiCount: number;
  paginaUfficiale: string;
  paginaWebcam: string;
  note: string;
};

export const COMPRENSORI: ComprensorioStatico[] = [
  {
    slug: "tarvisio",
    nome: "Tarvisio",
    gruppoUfficiale: "Tarvisio",
    comune: "Tarvisio",
    provincia: "UD",
    altitudineMinM: 754,
    altitudineMaxM: 1756,
    dislivelloSciabileM: 1002,
    downhillKm: 24.0,
    fondoKm: 55.0,
    innevamentoProgrammatoPct: 100,
    impiantiCount: 10,
    tappetiCount: 3,
    paginaUfficiale: "https://www.promoturismo.fvg.it/it/137464/tarvisio",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/tarvisio",
    note: "3 tappeti trasportatori coperti.",
  },
  {
    slug: "sella-nevea",
    nome: "Sella Nevea",
    gruppoUfficiale: "Sella Nevea-Kanin",
    comune: "Chiusaforte",
    provincia: "UD",
    altitudineMinM: 1140,
    altitudineMaxM: 2133,
    dislivelloSciabileM: 993,
    downhillKm: 10.5,
    fondoKm: 2.5,
    innevamentoProgrammatoPct: 80,
    impiantiCount: 3,
    tappetiCount: 1,
    paginaUfficiale: "https://www.turismofvg.it/it/montagna365/sella-nevea?LangSetCMS=it",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/sella-nevea?LangSetCMS=it",
    note: "1 tappeto trasportatore coperto.",
  },
  {
    slug: "ravascletto-zoncolan",
    nome: "Ravascletto / Zoncolan",
    gruppoUfficiale: "Zoncolan",
    comune: "Ravascletto / Sutrio",
    provincia: "UD",
    altitudineMinM: 952,
    altitudineMaxM: 1970,
    dislivelloSciabileM: 1018,
    downhillKm: 23.0,
    fondoKm: 5.0,
    innevamentoProgrammatoPct: 100,
    impiantiCount: 7,
    tappetiCount: 6,
    paginaUfficiale: "https://www.turismofvg.it/it/montagna365/zoncolan",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/zoncolan",
    note: "6 tappeti trasportatori, di cui 2 coperti. Area Pradibosco separata: 2 impianti, 1,2 km area sciabile, 23 km fondo.",
  },
  {
    slug: "piancavallo",
    nome: "Piancavallo",
    gruppoUfficiale: "Piancavallo",
    comune: "Aviano",
    provincia: "PN",
    altitudineMinM: 1280,
    altitudineMaxM: 1805,
    dislivelloSciabileM: 525,
    downhillKm: 14.0,
    fondoKm: 12.0,
    innevamentoProgrammatoPct: 100,
    impiantiCount: 6,
    tappetiCount: 5,
    paginaUfficiale: "https://www.promoturismo.fvg.it/it/137744/piancavallo",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/piancavallo",
    note: "5 tappeti trasportatori, di cui 2 coperti; fondo 12 km + anello illuminato 1,5 km.",
  },
  {
    slug: "forni-di-sopra",
    nome: "Forni di Sopra",
    gruppoUfficiale: "Forni di Sopra e Sauris",
    comune: "Forni di Sopra",
    provincia: "UD",
    altitudineMinM: 907,
    altitudineMaxM: 2067,
    dislivelloSciabileM: 1160,
    downhillKm: 13.0,
    fondoKm: 14.0,
    innevamentoProgrammatoPct: 100,
    impiantiCount: 5,
    tappetiCount: 3,
    paginaUfficiale: "https://www.turismofvg.it/it/montagna365/forni-di-sopra?LangSetCMS=it",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/forni-di-sopra?LangSetCMS=it",
    note: "Piste fondo 14 km, di cui 2 km illuminati.",
  },
  {
    slug: "sappada-forni-avoltri",
    nome: "Sappada / Forni Avoltri",
    gruppoUfficiale: "Sappada",
    comune: "Sappada / Forni Avoltri",
    provincia: "UD",
    altitudineMinM: 1245,
    altitudineMaxM: 2024,
    dislivelloSciabileM: 779,
    downhillKm: 15.0,
    fondoKm: 14.0,
    innevamentoProgrammatoPct: 100,
    impiantiCount: 8,
    tappetiCount: 0,
    paginaUfficiale: "https://www.promoturismo.fvg.it/it/137749/sappada-forni-avoltri",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/sappada",
    note: "A Forni Avoltri il Centro Federale Carnia Arena dispone di 10 km di piste da fondo.",
  },
  {
    slug: "sauris",
    nome: "Sauris",
    gruppoUfficiale: "Forni di Sopra e Sauris",
    comune: "Sauris",
    provincia: "UD",
    altitudineMinM: null,
    altitudineMaxM: null,
    dislivelloSciabileM: 300,
    downhillKm: 3.0,
    fondoKm: 9.05,
    innevamentoProgrammatoPct: null,
    impiantiCount: 2,
    tappetiCount: 2,
    paginaUfficiale: "https://www.promoturismo.fvg.it/it/137754/sauris",
    paginaWebcam: "https://www.turismofvg.it/it/montagna365/sauris",
    note: "2 sciovie e 2 tappeti. Fondo: Untervelt 7,5 km + Plotze 1,55 km.",
  },
];

export type DatiLiveComprensorio = {
  stato: StatoImpianti;
  temperaturaC: number | null;
  neveSuPista: string | null;
  neveMinCm: number | null;
  neveMaxCm: number | null;
  impiantiAperti: number | null;
  impiantiTotali: number | null;
  pisteApertePct: number | null;
  tappetiAperti: number | null;
  tappetiTotali: number | null;
  struttureAperte: number | null;
  struttureTotali: number | null;
  fondoAperto: number | null;
  fondoTotale: number | null;
  orari: string | null;
  osservatoIl: string | null;
  controllatoIl: string | null;
  stale: boolean;
  errore: string | null;
};

export type SnapshotNeveImpianti = {
  generatoIl: string;
  perComprensorio: Record<string, DatiLiveComprensorio>;
};

export const ETICHETTA_STATO: Record<StatoImpianti, string> = {
  aperto: "Impianti aperti",
  parziale: "Parzialmente aperto",
  chiuso: "Impianti chiusi",
  sconosciuto: "Stato non disponibile",
};

// `allerta.verde`/`allerta.arancione` sono sfondi FISSI (non cambiano
// col tema) — vanno abbinati a un testo di contrasto anch'esso fisso,
// non alle varianti "-ink" (quelle sono per testo libero su sfondo
// pagina, cambiano col tema). Stesso principio e stesso colore
// "#241B04" già usati per l'arancione in prontosoccorso.ts/veterinari.ts.
export function classeBadgeStato(stato: StatoImpianti): string {
  switch (stato) {
    case "aperto":
      return "bg-allerta-verde text-white";
    case "parziale":
      return "bg-allerta-arancione text-[#241B04]";
    case "chiuso":
      return "bg-panel border border-line text-ink-dim";
    default:
      return "bg-panel border border-line text-ink-faint";
  }
}

export function formattaConteggio(aperti: number | null, totali: number | null): string {
  if (totali === null) return "n/d";
  if (aperti === null) return `?/${totali}`;
  return `${aperti}/${totali}`;
}

export function formattaNeve(live: DatiLiveComprensorio): string {
  if (live.neveMinCm !== null && live.neveMaxCm !== null) {
    return live.neveMinCm === live.neveMaxCm
      ? `${live.neveMinCm} cm`
      : `${live.neveMinCm}–${live.neveMaxCm} cm`;
  }
  if (live.neveSuPista) return live.neveSuPista;
  return "---";
}

export function formattaOra(iso: string | null): string {
  if (!iso) return "mai";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
