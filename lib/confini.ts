// Viabilità → Confini (16/09/2026). L'utente ha caricato un pacchetto
// di partenza generato con ChatGPT (`FVG_Monitor_Confini_v3.zip`):
// schema SQLite in 3 stadi (fonti grezze → normalizzatore eventi →
// aggregatore per valico), CSV anagrafico di 15 valichi/direttrici
// (11 Italia-Slovenia, 4 Italia-Austria), e tre script Python
// (update_border_sources.py, normalize_traffic.py, aggregate_crossings.py).
//
// **Verificato prima di implementare, e ridimensionato di conseguenza**:
// a differenza di Neve & Impianti (dove una fonte pubblica verificabile
// esisteva davvero), qui NESSUNA delle fonti quantitative indicate nel
// pacchetto si è rivelata utilizzabile da questa sessione:
// - Promet.si (Slovenia, la fonte "tecnicamente migliore" secondo il
//   pacchetto stesso): le pagine pubbliche di fallback sono SPA
//   JavaScript, nessun dato nell'HTML iniziale (stesso limite già visto
//   per Pronto Soccorso prima che l'utente fornisse l'endpoint reale).
//   L'endpoint B2B (quello con dati veri) richiede un token
//   `Authorization: bearer` che non è stato fornito — il pacchetto
//   stesso lo segnala esplicitamente ("I valori live non sono
//   inventati... Promet.si B2B richiede un token").
// - ASFINAG (Austria): pagina pubblica non raggiungibile (403) da
//   questa sessione; nessun endpoint di open data verificato.
// - ANAS (Italia, strade statali): portali "VAI"/InfoAnas non
//   raggiungibili da questa sessione (429/robots.txt bloccato), nessun
//   feed pubblico verificato.
// - CCISS: nessun endpoint concreto indicato nel pacchetto, solo
//   citato come fonte prevista dal normalizzatore.
//
// **Un'eccezione reale**: per i 2 valichi autostradali (Tarvisio
// Autostrada/A23 verso l'Austria, Sant'Andrea/Vrtojba sulla A34 verso
// la Slovenia) il sito ingerisce GIÀ un feed reale e verificato,
// `ingestViabilita()` in scripts/ingest-light.mjs (InfoViaggiando/
// Autostrade Alto Adriatico, snapshot Supabase `viabilita:autostrade`,
// usato anche da ViabilitaPanel.tsx) — questi due valichi mostrano
// quindi gli eventi reali già raccolti per quell'autostrada, filtrati
// per codice. Nessuna nuova ingestione aggiunta: si riusa quella
// esistente, nessun rischio nuovo introdotto.
//
// **Per questo la pagina qui è volutamente più semplice del pacchetto
// originale**: solo l'anagrafica dei 15 valichi (dati amministrativi
// stabili, non time-sensitive — nome, comune, strada, classe) più gli
// eventi reali già disponibili per i 2 valichi autostradali. Nessuna
// tabella traffico/contatori/webcam/stato controlli di frontiera (il
// pacchetto stesso avvisa di tenere separato lo stato controlli e di
// "non dedurlo da una coda" — qui non c'è nemmeno una coda misurata,
// quindi a maggior ragione nessuna deduzione). Gli script Python del
// pacchetto (aggregatore/normalizzatore/updater) NON sono stati
// eseguiti né portati in JavaScript, perché dipendono tutti da fonti
// non verificabili da qui — stessa disciplina già applicata al
// pacchetto Neve & Impianti (mai fidarsi di una pipeline generata da
// un altro strumento senza controllo diretto).

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
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Principale direttrice Trieste–Lubiana. Promet.si segnala anche limitazioni stagionali merci sulla A3 Divača–Fernetiči.",
    autostradeCollegate: [],
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
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Direttrice principale verso Koper/Capodistria e Istria.",
    autostradeCollegate: [],
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
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "ANAS",
    note: "Valico stradale utile per Carso, Kozina e direttrici verso Croazia.",
    autostradeCollegate: [],
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
    fonteTraffico: "Promet.si B2B (non disponibile: token richiesto)",
    fonteItalia: "InfoViaggiando / Autostrade Alto Adriatico",
    note: "Principale direttrice Gorizia–Nova Gorica–H4. Molto sensibile ai lavori sulla H4.",
    autostradeCollegate: ["A34"],
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
  },
];
