// Viabilità → Confini (16/09/2026, esteso il 16/09/2026 — sblocco
// Promet.si). L'utente ha caricato un pacchetto di partenza generato
// con ChatGPT (`FVG_Monitor_Confini_v3.zip`): schema SQLite in 3 stadi
// (fonti grezze → normalizzatore eventi → aggregatore per valico), CSV
// anagrafico di 15 valichi/direttrici (11 Italia-Slovenia, 4
// Italia-Austria), e tre script Python (update_border_sources.py,
// normalize_traffic.py, aggregate_crossings.py).
//
// **Verificato prima di implementare, e ridimensionato di conseguenza**:
// a differenza di Neve & Impianti (dove una fonte pubblica verificabile
// esisteva davvero), qui NESSUNA delle fonti quantitative indicate nel
// pacchetto si è rivelata direttamente utilizzabile da questa sessione:
// - Promet.si (Slovenia): le pagine pubbliche di fallback sono SPA
//   JavaScript, nessun dato nell'HTML iniziale. L'endpoint B2B
//   ufficiale richiede un token `Authorization: bearer` mai fornito.
//   **Sbloccato parzialmente il 16/09/2026** (vedi sotto) tramite
//   reverse engineering delle vector tile della mappa, non l'API B2B.
// - ASFINAG (Austria): pagina pubblica non raggiungibile (403) da
//   questa sessione; nessun endpoint di open data verificato.
// - ANAS (Italia, strade statali): portali "VAI"/InfoAnas non
//   raggiungibili da questa sessione (429/robots.txt bloccato), nessun
//   feed pubblico verificato.
// - CCISS: nessun endpoint concreto indicato nel pacchetto, solo
//   citato come fonte prevista dal normalizzatore.
//
// **Due fonti reali oggi**:
// 1. Per i 2 valichi autostradali (Tarvisio Autostrada/A23 verso
//    l'Austria, Sant'Andrea/Vrtojba sulla A34 verso la Slovenia) il
//    sito ingerisce GIÀ un feed reale e verificato, `ingestViabilita()`
//    in scripts/ingest-light.mjs (InfoViaggiando/Autostrade Alto
//    Adriatico, snapshot Supabase `viabilita:autostrade`, usato anche
//    da ViabilitaPanel.tsx) — lato ITALIANO della strada.
// 2. **Nuovo (16/09/2026)**: `ingestConfiniPrometsi()` in
//    scripts/ingest-light.mjs legge la vector tile pubblica di
//    Promet.si (`coreTileVector`, z=7 x=68 y=45 — formato Mapbox
//    Vector Tile/protobuf, decodificato a mano, nessuna libreria
//    aggiunta) e ne estrae gli eventi reali di traffico per i valichi
//    coperti da quella tile, lato SLOVENO. Scoperto analizzando un HAR
//    catturato dal browser dell'utente: la richiesta GET funziona con
//    solo `User-Agent` + `Referer` (nessun cookie/token), a differenza
//    dell'endpoint POST `/dc/agg` (irrilevante comunque per i nostri
//    valichi: copre solo le 10 direttrici nazionali slovene verso
//    Lubiana). **Copre SOLO 4 dei nostri 11 valichi verso la Slovenia**
//    (`codiceStradaPromet` sotto): Fernetti (A3), Rabuiese/Škofije
//    (H5), Sant'Andrea/Vrtojba (H4), Pesek/Kozina (G1-7, dedotto
//    dall'anagrafica ma mai osservato in un evento reale nel campione
//    — da riverificare). Gli altri 7 valichi sloveni (Basovizza,
//    Lazzaretto, Casa Rossa, Stupizza, Uccea, Predil, Fusine) non sono
//    coperti dalla tile catturata — servirebbe un nuovo HAR con la
//    mappa centrata più a nord (Tarvisio/Bovec/Nova Gorica) per
//    scoprire le tile giuste. I 4 valichi Italia-Austria restano
//    interamente scoperti (serve ASFINAG o ANAS, non ancora sbloccati).
//    **Non ancora confermato in produzione**: questa sandbox non può
//    raggiungere promet.si direttamente, quindi la richiesta non è
//    mai stata eseguita con successo da qui — solo dedotta dall'HAR.
//    La prima conferma reale arriva dai log di GitHub Actions. Se
//    dovesse fallire, il fallback "mantieni l'ultimo dato valido e
//    marca stale" (stesso pattern di Neve & Impianti) evita comunque
//    che la pagina si rompa o mostri dati inventati.
//
// **Per questo la pagina qui resta più semplice del pacchetto
// originale**: anagrafica dei 15 valichi (dati amministrativi stabili,
// non time-sensitive — nome, comune, strada, classe) più gli eventi
// reali disponibili (lato italiano per i 2 valichi autostradali, lato
// sloveno per i 4 valichi coperti da Promet.si). Nessuna tabella
// traffico/contatori/webcam/stato controlli di frontiera (il pacchetto
// stesso avvisa di tenere separato lo stato controlli e di "non
// dedurlo da una coda" — qui non c'è nemmeno una coda misurata per la
// maggior parte dei valichi, quindi a maggior ragione nessuna
// deduzione). Gli script Python del pacchetto (aggregatore/
// normalizzatore/updater) NON sono stati eseguiti né portati in
// JavaScript, perché dipendono tutti da fonti non verificabili da qui
// — stessa disciplina già applicata al pacchetto Neve & Impianti (mai
// fidarsi di una pipeline generata da un altro strumento senza
// controllo diretto).

export type PaeseConfine = "SI" | "AT";

export type Valico = {
  id: string;
  nome: string;
  nomeStraniero: string;
  paese: PaeseConfine;
  area: string;
  comuneIt: string;
  comuneStraniero: string;
  stradaIt: string;
  stradaStraniera: string;
  classe: "primary" | "secondary" | "minor";
  modalita: "motorway" | "expressway" | "road" | "mountain_road" | "mountain_pass" | "urban";
  mapQuery: string;
  fonteTraffico: string;
  fonteItalia: string;
  note: string;
  /** Codici autostrada (AUTOSTRADA nel feed InfoViaggiando) per cui esiste
   * già un'ingestione reale nel sito — solo questi 2 valichi hanno un
   * riquadro "eventi in corso" popolato con dati veri. */
  autostradeCollegate: string[];
  /** Codice strada sloveno (campo `Cesta` nella tile Promet.si) per cui
   * `ingestConfiniPrometsi()` cerca eventi live — null per i valichi non
   * ancora coperti dalla tile catturata finora (vedi commento in cima). */
  codiceStradaPromet: string | null;
};

export const NOME_PAESE: Record<PaeseConfine, string> = {
  SI: "Slovenia",
  AT: "Austria",
};

export const ETICHETTA_MODALITA: Record<Valico["modalita"], string> = {
  motorway: "Autostrada",
  expressway: "Superstrada",
  road: "Strada",
  mountain_road: "Strada di montagna",
  mountain_pass: "Passo di montagna",
  urban: "Valico urbano",
};

export const ETICHETTA_CLASSE: Record<Valico["classe"], string> = {
  primary: "Direttrice principale",
  secondary: "Direttrice secondaria",
  minor: "Valico minore",
};

export const VALICHI: Valico[] = [
  {
    id: "fernetti",
    nome: "Fernetti",
    nomeStraniero: "Fernetiči / Sežana",
    paese: "SI",
    area: "Trieste",
    comuneIt: "Monrupino / Trieste",
    comuneStraniero: "Sežana",
    stradaIt: "RA14",
    stradaStraniera: "A3 / E70",
    classe: "primary",
    modalita: "motorway",
    mapQuery: "Valico di Fernetti, Italia Slovenia",
    fonteTraffico: "Promet.si (coreTileVector, lato sloveno — sperimentale, vedi commento in cima al file)",
    fonteItalia: "ANAS",
    note: "Principale direttrice Trieste–Lubiana. Promet.si segnala anche limitazioni stagionali merci sulla A3 Divača–Fernetiči.",
    autostradeCollegate: [],
    codiceStradaPromet: "A3",
  },
  {
    id: "rabuiese",
    nome: "Rabuiese",
    nomeStraniero: "Škofije",
    paese: "SI",
    area: "Trieste",
    comuneIt: "Muggia",
    comuneStraniero: "Koper / Capodistria",
    stradaIt: "NSA326 / racc. RA13",
    stradaStraniera: "H5 / E751",
    classe: "primary",
    modalita: "expressway",
    mapQuery: "Valico di Rabuiese Škofije",
    fonteTraffico: "Promet.si (coreTileVector, lato sloveno — sperimentale, vedi commento in cima al file)",
    fonteItalia: "ANAS",
    note: "Direttrice principale verso Koper/Capodistria e Istria.",
    autostradeCollegate: [],
    codiceStradaPromet: "H5",
  },
  {
    id: "pesek",
    nome: "Pesek",
    nomeStraniero: "Kozina",
    paese: "SI",
    area: "Trieste",
    comuneIt: "San Dorligo della Valle",
    comuneStraniero: "Hrpelje-Kozina",
    stradaIt: "SS14",
    stradaStraniera: "7",
    classe: "primary",
    modalita: "road",
    mapQuery: "Valico di Pesek Kozina",
    fonteTraffico: "Promet.si (coreTileVector, lato sloveno — codice strada dedotto, mai osservato in un evento reale, vedi commento in cima al file)",
    fonteItalia: "ANAS",
    note: "Valico stradale utile per Carso, Kozina e direttrici verso Croazia.",
    autostradeCollegate: [],
    codiceStradaPromet: "G1-7",
  },
  {
    id: "basovizza-lipica",
    nome: "Basovizza / Lipizza",
    nomeStraniero: "Lipica",
    paese: "SI",
    area: "Trieste",
    comuneIt: "Trieste",
    comuneStraniero: "Sežana",
    stradaIt: "SP10",
    stradaStraniera: "205",
    classe: "secondary",
    modalita: "road",
    mapQuery: "Valico Basovizza Lipica",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "Ente regionale/locale",
    note: "Traffico prevalentemente locale/turistico.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "lazaret",
    nome: "San Bartolomeo / Lazzaretto",
    nomeStraniero: "Lazaret",
    paese: "SI",
    area: "Trieste",
    comuneIt: "Muggia",
    comuneStraniero: "Ankaran",
    stradaIt: "SP14",
    stradaStraniera: "406",
    classe: "secondary",
    modalita: "road",
    mapQuery: "Valico San Bartolomeo Lazaret Muggia Ankaran",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "Ente regionale/locale",
    note: "Valico costiero locale Muggia–Ankaran.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "sant-andrea-vrtojba",
    nome: "Sant'Andrea",
    nomeStraniero: "Vrtojba",
    paese: "SI",
    area: "Gorizia",
    comuneIt: "Gorizia",
    comuneStraniero: "Šempeter-Vrtojba",
    stradaIt: "A34",
    stradaStraniera: "H4",
    classe: "primary",
    modalita: "expressway",
    mapQuery: "Valico Sant'Andrea Vrtojba Gorizia",
    fonteTraffico: "InfoViaggiando (lato italiano) + Promet.si coreTileVector (lato sloveno — sperimentale)",
    fonteItalia: "InfoViaggiando / Autostrade Alto Adriatico",
    note: "Principale direttrice Gorizia–Nova Gorica–H4. Molto sensibile ai lavori sulla H4.",
    autostradeCollegate: ["A34"],
    codiceStradaPromet: "H4",
  },
  {
    id: "casa-rossa",
    nome: "Casa Rossa",
    nomeStraniero: "Rožna Dolina / Nova Gorica",
    paese: "SI",
    area: "Gorizia",
    comuneIt: "Gorizia",
    comuneStraniero: "Nova Gorica",
    stradaIt: "Via Casa Rossa",
    stradaStraniera: "444",
    classe: "secondary",
    modalita: "urban",
    mapQuery: "Valico Casa Rossa Rožna Dolina Gorizia Nova Gorica",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "Ente regionale/locale",
    note: "Valico urbano Gorizia–Nova Gorica.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "stupizza-robic",
    nome: "Stupizza",
    nomeStraniero: "Robič",
    paese: "SI",
    area: "Valli del Natisone",
    comuneIt: "Pulfero",
    comuneStraniero: "Kobarid",
    stradaIt: "SS54",
    stradaStraniera: "102",
    classe: "secondary",
    modalita: "road",
    mapQuery: "Valico Stupizza Robič",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Direttrice Cividale–Kobarid.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "uccea-ucja",
    nome: "Uccea",
    nomeStraniero: "Učja",
    paese: "SI",
    area: "Val Resia",
    comuneIt: "Resia",
    comuneStraniero: "Bovec",
    stradaIt: "SR646",
    stradaStraniera: "401",
    classe: "minor",
    modalita: "mountain_road",
    mapQuery: "Valico Uccea Učja",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "Ente regionale/locale",
    note: "Valico montano secondario.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "predil-predel",
    nome: "Passo del Predil",
    nomeStraniero: "Predel",
    paese: "SI",
    area: "Tarvisiano",
    comuneIt: "Tarvisio",
    comuneStraniero: "Bovec",
    stradaIt: "SS54",
    stradaStraniera: "203",
    classe: "secondary",
    modalita: "mountain_pass",
    mapQuery: "Passo del Predil Predel",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Passo montano; stato viario e meteo particolarmente rilevanti in inverno.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "fusine-ratece",
    nome: "Fusine",
    nomeStraniero: "Rateče",
    paese: "SI",
    area: "Tarvisiano",
    comuneIt: "Tarvisio",
    comuneStraniero: "Kranjska Gora",
    stradaIt: "SS54",
    stradaStraniera: "202",
    classe: "primary",
    modalita: "road",
    mapQuery: "Valico Fusine Rateče",
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Principale collegamento stradale Tarvisio–Kranjska Gora.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "tarvisio-autostrada",
    nome: "Tarvisio Autostrada / Confine A23",
    nomeStraniero: "Arnoldstein A2",
    paese: "AT",
    area: "Tarvisiano",
    comuneIt: "Tarvisio",
    comuneStraniero: "Arnoldstein",
    stradaIt: "A23",
    stradaStraniera: "A2",
    classe: "primary",
    modalita: "motorway",
    mapQuery: "Confine A23 A2 Tarvisio Arnoldstein",
    fonteTraffico: "ASFINAG (non disponibile da qui)",
    fonteItalia: "Autostrade per l'Italia",
    note: "Principale valico autostradale FVG–Austria.",
    autostradeCollegate: ["A23"],
    codiceStradaPromet: null,
  },
  {
    id: "coccau-arnoldstein",
    nome: "Coccau",
    nomeStraniero: "Arnoldstein",
    paese: "AT",
    area: "Tarvisiano",
    comuneIt: "Tarvisio",
    comuneStraniero: "Arnoldstein",
    stradaIt: "SS13",
    stradaStraniera: "B83",
    classe: "primary",
    modalita: "road",
    mapQuery: "Valico Coccau Arnoldstein",
    fonteTraffico: "ASFINAG (non disponibile da qui)",
    fonteItalia: "ANAS",
    note: "Alternativa stradale alla A23/A2; ASFINAG dispone di webcam nell'area Zollamt Arnoldstein.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "pramollo-nassfeld",
    nome: "Passo Pramollo",
    nomeStraniero: "Nassfeldpass",
    paese: "AT",
    area: "Canal del Ferro",
    comuneIt: "Pontebba",
    comuneStraniero: "Hermagor",
    stradaIt: "SP110",
    stradaStraniera: "B90",
    classe: "secondary",
    modalita: "mountain_pass",
    mapQuery: "Passo Pramollo Nassfeldpass",
    fonteTraffico: "ASFINAG regionale (non disponibile da qui)",
    fonteItalia: "Ente regionale/locale",
    note: "Valico montano/turistico; priorità a stato strada, neve e chiusure.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
  {
    id: "monte-croce-carnico",
    nome: "Passo Monte Croce Carnico",
    nomeStraniero: "Plöckenpass",
    paese: "AT",
    area: "Carnia",
    comuneIt: "Paluzza",
    comuneStraniero: "Kötschach-Mauthen",
    stradaIt: "SS52bis",
    stradaStraniera: "B110",
    classe: "secondary",
    modalita: "mountain_pass",
    mapQuery: "Passo Monte Croce Carnico Plöckenpass",
    fonteTraffico: "ASFINAG regionale (non disponibile da qui)",
    fonteItalia: "ANAS",
    note: "Riaperto nel 2026 dopo lunga chiusura; possibili chiusure temporanee per lavori. Da trattare con stato strada prioritario.",
    autostradeCollegate: [],
    codiceStradaPromet: null,
  },
];
