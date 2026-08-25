// Database delle aviostrutture del Friuli Venezia Giulia (aeroporti civili
// e militari, aviosuperfici, campi volo, elisuperfici, piste dismesse) —
// sezione Aviazione, richiesta dall'utente il 25/08/2026, arricchita il
// 25/08/2026 con dati sulle piste (orientamento, lunghezza, pavimentazione)
// e nuove strutture su richiesta dell'utente.
//
// FONTI (tre, combinate):
//
// A) webaai.it (World Airfields Directory / WebAAI) — fonte principale per
//    l'elenco e l'anagrafica di ogni struttura: pagina elenco
//    https://webaai.it/it/aviostrutture/friuli_venezia_giulia (27 strutture
//    elencate al 25/08/2026) e le rispettive pagine di dettaglio.
//
// B) qnhfly.com — fonte per i dati di pista (orientamento/QFU, lunghezza,
//    pavimentazione) delle aviosuperfici e campi volo civili: questi campi
//    sono dietro paywall "Premium" su webaai.it, ma pubblicamente visibili
//    (senza login) sulle schede di dettaglio di qnhfly.com, es.
//    https://www.qnhfly.com/en/airfield/140/aviosuperficie-al-casale-volo-friuli
//    Copre 22 delle strutture civili minori del FVG (non copre aeroporti
//    militari, né le strutture non censite come "campo volo/aviosuperficie"
//    civile). Il campo `pisteDettaglio` e `fonteDatiPista` sotto indicano
//    dove questo dato è stato integrato.
//
// C) webaai.it, sezione "elisuperfici-enac" (pagina separata da
//    "aviostrutture", non letta nella raccolta iniziale del 25/08/2026):
//    https://webaai.it/it/elistrutture/friuli_venezia_giulia — 3 elisuperfici
//    del FVG con dati anagrafici pubblici (senza login).
//
// NOTE:
//
// 1) **Dati statici, non un modulo ingerito**: a differenza di Calcio/
//    Basket/Baseball/Tennis/Sci, questo NON è un dato che cambia di
//    frequente (sono strutture fisiche, non classifiche/calendari
//    sportivi) — nessuna funzione ingestXxx() in ingest-light.mjs, nessuna
//    tabella Supabase. Popolato leggendo ogni pagina via WebFetch (gli host
//    webaai.it, qnhfly.com e avio-superfici.enac.gov.it, come
//    comitati.fisi.org e l'host Tennis, risultano bloccati dalla allowlist
//    di rete di questo sandbox per un fetch diretto — stesso limite già
//    documentato per Tennis/Sci — ma WebFetch stesso ha funzionato per
//    webaai.it e qnhfly.com, restituendo i dati reali invece del solito
//    "nessun markup" che si ha con pagine JS/AJAX-dipendenti: sono pagine
//    HTML statiche lato server). Da aggiornare manualmente in una sessione
//    futura se l'utente segnala nuove strutture o dati cambiati — non c'è
//    ancora un meccanismo automatico.
//
// 2) **Il portale ufficiale ENAC (avio-superfici.enac.gov.it) è stato
//    valutato come fonte su richiesta dell'utente (25/08/2026) ma
//    scartato**: è un'applicazione JS-dipendente (la ricerca/filtro per
//    regione non è esprimibile con parametri URL indovinati — tentati senza
//    successo `?regione_id=`, `?province=`, `/api/public/surfaces?...`), e
//    le sue pagine di dettaglio raggiungibili (es.
//    `/it/public/surface/show/{id}`) dichiarano esplicitamente che i dati
//    tecnici completi (coordinate, comune, provincia, orientamento e
//    lunghezza pista) "sono pubblicati e consultabili, previa
//    registrazione, al seguente link www.webaai.it" — cioè ENAC stesso
//    rimanda al portale (B)/(A) sopra per questi campi, con la stessa
//    barriera di registrazione. Non è quindi una fonte alternativa
//    "gratuita" rispetto a webaai.it per orientamento/lunghezza pista.
//
// 3) **Molti dati restano dietro un paywall "Premium"** sul sito webaai.it:
//    contatti, orari di apertura, frequenze radio, foto, mappe di
//    avvicinamento. Qui sono inclusi solo i campi pubblicamente visibili
//    senza login — per orientamento/lunghezza/pavimentazione pista, vedi
//    nota 0 (fonte B, qnhfly.com) quando disponibili.
//
// 4) **Incongruenza "33 vs 27" — parzialmente risolta il 25/08/2026**: la
//    pagina elenco di webaai.it dichiara un totale di "33 strutture", ma la
//    tabella "aviostrutture" mostra 27 voci distinte. Cercando anche la
//    pagina separata "elisuperfici" dello stesso sito, e incrociando
//    l'elenco di qnhfly.com, sono emerse 5 strutture aggiuntive non
//    presenti nell'elenco "aviostrutture" originale: 2 campi volo civili
//    (Pajaro Loco a Sesto al Reghena, Aerocampo Prosecco a Sgonico — TS,
//    provincia non ancora presente in questo dataset) + 3 elisuperfici
//    (Elifriulia Ronchi, Elifriulia Tolmezzo, Mondschein a Sappada) — totale
//    32. Non si è trovata una fonte pubblica che elenchi la 33ª struttura
//    con certezza: possibile un'ulteriore elisuperficie/idrosuperficie non
//    ancora individuata, o un doppio conteggio nella pagina originale. Non
//    inventata: usate le 32 confermate.
//
// 5) **Casarsa della Delizia — orientamento/lunghezza pista NON reperiti**:
//    l'utente ha indicato come esempio "06/24" e "350 metri" per questa
//    struttura (aeroporto militare), ma questo dato non è stato trovato in
//    nessuna delle fonti pubbliche verificate: webaai.it (paywall),
//    ENAC (rimanda a webaai.it), qnhfly.com (non copre strutture militari),
//    OurAirports ("No runway information available" per LIDK),
//    airportguide.com e SkyVector (nessun dato di pista pubblicato). Le
//    coordinate fornite dall'utente sono state verificate contro più fonti
//    indipendenti (OurAirports, airportguide.com, SkyVector — tutte entro
//    circa 30 metri l'una dall'altra) e confermano quelle già presenti in
//    questo file. Se l'utente ha una fonte specifica per l'orientamento e
//    la lunghezza pista di Casarsa, va aggiunta manualmente.
//
// 6) **"Diffidare dei codici non documentati"**: il prefisso del "codice
//    avioportolano" di webaai.it (es. `UD19` per Casarsa della Delizia) non
//    è un indicatore affidabile di provincia — Casarsa della Delizia è
//    amministrativamente in provincia di Pordenone nonostante il codice
//    `UD19` — corretto qui a `provincia: "PN"`. qnhfly.com usa un altro
//    schema di codici ancora (es. "PNCDV", "UDBER") — non incrociato con
//    il `codice` di webaai.it per evitare di mescolare due sistemi diversi;
//    quei codici qnhfly non sono stati importati in questo file.
//
// 7) **Coordinate**: webaai.it usa due notazioni diverse a seconda della
//    pagina (gradi+minuti decimali in formato aeronautico, es.
//    "4549.650N", oppure gradi/minuti/secondi, es. "45°49'39\"N"), qnhfly.com
//    e la pagina elisuperfici di webaai.it usano gradi/minuti/secondi —
//    tutte convertite qui in gradi decimali (`lat`/`lon`), verificate
//    contro le coordinate reali note di Trieste Airport (LIPQ), Rivolto e
//    Casarsa della Delizia (LIDK) come controllo di sanità.
//
// 8) **"Ultimo aggiornamento" (`aggiornatoFonte`) è per singola struttura**,
//    dichiarato dalla fonte sulla pagina di dettaglio — non è la data in
//    cui abbiamo raccolto il dato noi, varia da struttura a struttura.
//
// 9) **Alcune strutture risultano "dismesse" per webaai.it/ENAC ma con
//    pista ancora indicata come attiva su qnhfly.com** (Flysynthesis a
//    Mortegliano/Lavariano, La Comina a Pordenone): mantenuta qui la
//    categoria di webaai.it/ENAC (fonte più autorevole per lo stato
//    amministrativo), ma inclusi comunque i dati di pista di qnhfly.com per
//    completezza — potrebbero riferirsi a un uso residuale/non ufficiale.

export type CategoriaAviostruttura =
  | "aeroporto-civile"
  | "aeroporto-militare"
  | "aviosuperficie"
  | "campo-volo"
  | "elisuperficie"
  | "pista-dismessa";

export type PistaDettaglio = {
  orientamento: string; // QFU, es. "09/27"
  lunghezzaM: number | null;
  pavimentazione: string | null; // es. "Erba", "Asfalto"
};

export type Aviostruttura = {
  nome: string;
  urlFonte: string | null; // pagina di dettaglio (webaai.it, o qnhfly.com se non presente su webaai.it), null se non esiste
  comune: string;
  localita: string | null; // frazione/toponimo locale, se diverso dal comune
  provincia: "UD" | "GO" | "PN" | "TS";
  tipo: string; // descrizione testuale così come mostrata dalla fonte
  categoria: CategoriaAviostruttura; // stessa info di `tipo`, normalizzata per i filtri della pagina
  codice: string | null; // codice avioportolano ENAC secondo webaai.it (es. "UD12") — vedi nota 6 sopra
  icao: string | null;
  indirizzo: string | null;
  cap: string | null;
  lat: number | null;
  lon: number | null;
  quotaM: number | null;
  piste: number | null;
  categorieVolo: string[]; // abilitazioni: General aviation, Advanced UL, Basic UL, Gliders, Helicopters
  enacDirezione: string | null;
  fascicolo: string | null;
  aggiornatoFonte: string | null; // vedi nota 8 sopra
  pisteDettaglio: PistaDettaglio[] | null; // orientamento/lunghezza/pavimentazione per pista, fonte qnhfly.com — vedi nota 0/9 sopra
  fonteDatiPista: string | null; // URL della scheda qnhfly.com usata per pisteDettaglio, null se non disponibile
};

export const AVIOSTRUTTURE: Aviostruttura[] = [
  {
    nome: "Al Casale",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/al-casale_UD12",
    comune: "Codroipo",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD12",
    icao: "LIPT",
    indirizzo: "Casali Loreto, 3",
    cap: "33033",
    lat: 45.984822,
    lon: 12.923569,
    quotaM: null,
    piste: 1,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_85",
    aggiornatoFonte: "2026-05-14",
    pisteDettaglio: [{ orientamento: "09/27", lunghezzaM: 550, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/140/aviosuperficie-al-casale-volo-friuli",
  },
  {
    nome: "Al Ranch",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/al-ranch_UD02",
    comune: "Bertiolo",
    localita: null,
    provincia: "UD",
    tipo: "Campo volo (privato)",
    categoria: "campo-volo",
    codice: "UD02",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.9235,
    lon: 13.035667,
    quotaM: 20,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2019-01-18",
    pisteDettaglio: [{ orientamento: "14/32", lunghezzaM: 240, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/141/campo-volo-al-ranch-agriturismo",
  },
  {
    nome: "Ali Friuli",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/ali-friuli_UD01",
    comune: "Cividale del Friuli",
    localita: "Gradaria",
    provincia: "UD",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "UD01",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 46.05695,
    lon: 13.426333,
    quotaM: 114,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2025-01-15",
    pisteDettaglio: [{ orientamento: "18/36", lunghezzaM: 450, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/153/campo-volo-ali-friuli",
  },
  {
    nome: "Always",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/always_UD04",
    comune: "Povoletto",
    localita: "Primulacco",
    provincia: "UD",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "UD04",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 46.133467,
    lon: 13.27825,
    quotaM: 142,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-07-09",
    pisteDettaglio: [{ orientamento: "17/35", lunghezzaM: 310, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/149/campo-volo-always",
  },
  {
    nome: "AS77",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/as77_UD20",
    comune: "Mortegliano",
    localita: null,
    provincia: "UD",
    tipo: "Campo volo (privato)",
    categoria: "campo-volo",
    codice: "UD20",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.961433,
    lon: 13.2044,
    quotaM: 43,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2023-03-26",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Aviano",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/aviano_PN07",
    comune: "Aviano",
    localita: null,
    provincia: "PN",
    tipo: "Aeroporto militare (asfaltato)",
    categoria: "aeroporto-militare",
    codice: "PN07",
    icao: "LIPA",
    indirizzo: null,
    cap: null,
    lat: 46.03,
    lon: 12.598883,
    quotaM: 126,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2024-10-31",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Aviosuperficie Enemonzo",
    urlFonte: null,
    comune: "Enemonzo",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: null,
    icao: null,
    indirizzo: null,
    cap: null,
    lat: null,
    lon: null,
    quotaM: null,
    piste: null,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: null,
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "AVRO Rivoli di Osoppo",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/avro-rivoli-di-osoppo_UD03",
    comune: "Osoppo",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD03",
    icao: "LIKH",
    indirizzo: null,
    cap: "33010",
    lat: 46.234167,
    lon: 13.0725,
    quotaM: null,
    piste: 2,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL", "Gliders", "Helicopters"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_94",
    aggiornatoFonte: "2025-11-28",
    pisteDettaglio: [
      { orientamento: "02/20", lunghezzaM: 850, pavimentazione: "Asfalto" },
      { orientamento: "02/20", lunghezzaM: 550, pavimentazione: "Erba" },
    ],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/143/aviosuperficie-rivoli-avro",
  },
  {
    nome: "Cantina Turus",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/cantina-turus_GO03",
    comune: "Mossa",
    localita: null,
    provincia: "GO",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "GO03",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.923633,
    lon: 13.54035,
    quotaM: 51,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-07-09",
    // Dati pista da qnhfly.com "Campo Volo Isonzo": stesso comune (Mossa),
    // unica struttura di Mossa in entrambe le fonti — nome diverso da
    // "Cantina Turus" (probabilmente denominazione informale/toponimo),
    // non abbiamo trovato conferma indipendente che siano la stessa
    // struttura fisica oltre alla coincidenza di comune.
    pisteDettaglio: [{ orientamento: "16/34", lunghezzaM: 500, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/150/campo-volo-isonzo",
  },
  {
    nome: "Casarsa della Delizia",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/casarsa-della-delizia_UD19",
    comune: "Casarsa della Delizia",
    localita: null,
    provincia: "PN",
    tipo: "Aeroporto militare (asfaltato)",
    categoria: "aeroporto-militare",
    codice: "UD19",
    icao: "LIDK",
    indirizzo: null,
    cap: null,
    lat: 45.953517,
    lon: 12.8178,
    quotaM: 38,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2023-07-13",
    // Orientamento/lunghezza pista non reperiti — vedi nota 5 in cima al
    // file: nessuna fonte pubblica verificata li riporta per questa
    // struttura militare.
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Chiasiellis Associazione Volo",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/chiasiellis-associazione-volo_UD13",
    comune: "Mortegliano",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD13",
    icao: null,
    indirizzo: null,
    cap: "33050",
    lat: 45.945556,
    lon: 13.207778,
    quotaM: null,
    piste: 1,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_204",
    aggiornatoFonte: "2026-02-19",
    pisteDettaglio: [{ orientamento: "16/34", lunghezzaM: 400, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/152/aviosuperficie-chiasiellis",
  },
  {
    nome: "Enemonzo",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/enemonzo_UD05",
    comune: "Enemonzo",
    localita: null,
    provincia: "UD",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "UD05",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 46.404367,
    lon: 12.8853,
    quotaM: 373,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-02-19",
    // Dati pista da qnhfly.com "Campo Volo Zampieri" (stesso comune,
    // Enemonzo ha due voci distinte su webaai.it — questa è "Campo volo",
    // l'altra "Aviosuperficie Enemonzo" sopra, senza dati propri).
    // qnhfly nota "in fase di ampliamento" per la lunghezza.
    pisteDettaglio: [{ orientamento: "09/27", lunghezzaM: 450, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/148/campo-volo-zampieri",
  },
  {
    nome: "FLY & JOY",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/fly-and-joy_UD11",
    comune: "Premariacco",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD11",
    icao: null,
    indirizzo: "Casali Pasch 1",
    cap: "33040",
    lat: 46.066944,
    lon: 13.370278,
    quotaM: null,
    piste: 1,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_96",
    aggiornatoFonte: "2025-07-06",
    pisteDettaglio: [{ orientamento: "09/27", lunghezzaM: 700, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/146/aviosuperficie-flyejoy",
  },
  {
    nome: "Fly Evolution",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/fly-evolution_UD15",
    comune: "Pavia di Udine",
    localita: "Selvuzzis",
    provincia: "UD",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "UD15",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.981967,
    lon: 13.30705,
    quotaM: 57,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-02-19",
    pisteDettaglio: [{ orientamento: "15/33", lunghezzaM: 400, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/158/campo-volo-sg-fly-evolution",
  },
  {
    nome: "Flysynthesis",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/flysynthesis_UD14",
    comune: "Mortegliano",
    localita: "Lavariano",
    provincia: "UD",
    tipo: "Pista dismessa",
    categoria: "pista-dismessa",
    codice: "UD14",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.968683,
    lon: 13.23595,
    quotaM: 51,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2022-11-30",
    // qnhfly.com la mostra ancora come attiva (asfaltata) — vedi nota 9 in
    // cima al file. Categoria "pista dismessa" mantenuta da webaai.it/ENAC.
    pisteDettaglio: [{ orientamento: "10/28", lunghezzaM: 700, pavimentazione: "Asfalto" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/155/campo-volo-flysynthesis",
  },
  {
    nome: "Gorizia",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/gorizia_GO01",
    comune: "Gorizia",
    localita: null,
    provincia: "GO",
    tipo: "Aeroporto civile (non asfaltato)",
    categoria: "aeroporto-civile",
    codice: "GO01",
    icao: "LIPG",
    indirizzo: null,
    cap: null,
    lat: 45.9075,
    lon: 13.6,
    quotaM: 59,
    piste: 2,
    categorieVolo: ["General aviation", "Advanced UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-07-09",
    pisteDettaglio: [
      { orientamento: "04/22", lunghezzaM: 700, pavimentazione: "Erba" },
      { orientamento: "09/27", lunghezzaM: 1100, pavimentazione: "Erba" },
    ],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/136/aeroporto-di-gorizia",
  },
  {
    nome: "I Grifoni",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/i-grifoni_UD08",
    comune: "S.Vito al Torre",
    localita: "Nogaredo al Torre",
    provincia: "UD",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "UD08",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.913383,
    lon: 13.3718,
    quotaM: 29,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2023-11-20",
    pisteDettaglio: [{ orientamento: "16/34", lunghezzaM: 300, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/156/campo-volo-i-grifoni",
  },
  {
    nome: "iCordovado",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/icordovado_PN01",
    comune: "Cordovado",
    localita: null,
    provincia: "PN",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "PN01",
    icao: null,
    indirizzo: "Via Vilunghi 12",
    cap: null,
    lat: 45.8365,
    lon: 12.89255,
    quotaM: 12,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-02-19",
    pisteDettaglio: [{ orientamento: "07/25", lunghezzaM: 350, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/154/campo-volo-cordovado",
  },
  {
    nome: "La Comina",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/la-comina_PN03",
    comune: "Pordenone",
    localita: null,
    provincia: "PN",
    tipo: "Pista dismessa",
    categoria: "pista-dismessa",
    codice: "PN03",
    icao: "LIKL",
    indirizzo: null,
    cap: null,
    lat: 45.991517,
    lon: 12.654317,
    quotaM: 66,
    piste: 2,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2025-11-18",
    // qnhfly.com riporta una sola pista attiva (delle 2 indicate da
    // webaai.it) — vedi nota 9 in cima al file.
    pisteDettaglio: [{ orientamento: "18/36", lunghezzaM: 1200, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/142/aviosuperficie-la-comina",
  },
  {
    nome: "Pasiano",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/pasiano_PN04",
    comune: "Pasiano",
    localita: null,
    provincia: "PN",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "PN04",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.832417,
    lon: 12.59335,
    quotaM: 6,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-05-14",
    pisteDettaglio: [{ orientamento: "14/32", lunghezzaM: 340, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/151/campo-volo-pasiano",
  },
  {
    nome: "Piancada",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/piancada_UD10",
    comune: "Palazzolo dello Stella",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD10",
    icao: null,
    indirizzo: null,
    cap: "33056",
    lat: 45.7644,
    lon: 13.072806,
    quotaM: null,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_296",
    aggiornatoFonte: "2025-08-27",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Pravisdomini",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/pravisdomini_PN08",
    comune: "Pravisdomini",
    localita: null,
    provincia: "PN",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "PN08",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.82165,
    lon: 12.6835,
    quotaM: 7,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL", "Gliders"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-05-14",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Rivolto",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/rivolto_UD16",
    comune: "Rivolto",
    localita: null,
    provincia: "UD",
    tipo: "Aeroporto militare (asfaltato)",
    categoria: "aeroporto-militare",
    codice: "UD16",
    icao: "LIPI",
    indirizzo: null,
    cap: null,
    lat: 45.98055,
    lon: 13.05,
    quotaM: 55,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2023-07-13",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Sassodoro",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/sassodoro_PN06",
    comune: "Sequals",
    localita: "Solimbergo di Sequals",
    provincia: "PN",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: "PN06",
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 46.181667,
    lon: 12.822233,
    quotaM: 238,
    piste: 1,
    categorieVolo: ["Advanced UL", "Basic UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-01-22",
    pisteDettaglio: [{ orientamento: "16/34", lunghezzaM: 320, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/139/aviosuperficie-agriturismo-sasso-d-oro",
  },
  {
    nome: "Trieste Ronchi dei Legionari",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/trieste-ronchi-dei-legionari_GO02",
    comune: "Ronchi dei Legionari",
    localita: null,
    provincia: "GO",
    tipo: "Aeroporto civile (asfaltato)",
    categoria: "aeroporto-civile",
    codice: "GO02",
    icao: "LIPQ",
    indirizzo: null,
    cap: null,
    lat: 45.8275,
    lon: 13.472217,
    quotaM: 11,
    piste: 1,
    categorieVolo: ["General Aviation", "Advanced UL"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-04-16",
    pisteDettaglio: [{ orientamento: "09/27", lunghezzaM: 3000, pavimentazione: "Asfalto" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/138/aeroporto-di-trieste",
  },
  {
    nome: "Trivignano",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/trivignano_UD09",
    comune: "Trivignano Udinese",
    localita: null,
    provincia: "UD",
    tipo: "Aviosuperficie",
    categoria: "aviosuperficie",
    codice: "UD09",
    icao: null,
    indirizzo: null,
    cap: "33050",
    lat: 45.931111,
    lon: 13.361111,
    quotaM: null,
    piste: 1,
    categorieVolo: ["General aviation", "Advanced UL", "Basic UL"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.1_2024_269",
    aggiornatoFonte: "2025-06-13",
    pisteDettaglio: [{ orientamento: "09/27", lunghezzaM: 700, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/585/aviosuperficie-trivignano",
  },
  {
    nome: "Udine Campoformido",
    urlFonte: "https://webaai.it/it/aviostrutture/friuli_venezia_giulia/udine-campoformido_UD07",
    comune: "Pasian di Prato",
    localita: "Campoformido",
    provincia: "UD",
    tipo: "Aeroporto civile (non asfaltato)",
    categoria: "aeroporto-civile",
    codice: "UD07",
    icao: "LIPD",
    indirizzo: null,
    cap: null,
    lat: 46.0311,
    lon: 13.182783,
    quotaM: 93,
    piste: 1,
    categorieVolo: ["General aviation", "Advanced UL", "Gliders", "Helicopters"],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: "2026-04-16",
    pisteDettaglio: [{ orientamento: "04/22", lunghezzaM: 730, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/137/aeroporto-di-campoformido",
  },
  // ------------------------------------------------------------------
  // Strutture aggiunte il 25/08/2026 — non presenti nell'elenco
  // "aviostrutture" di webaai.it, trovate tramite qnhfly.com e la pagina
  // "elisuperfici" di webaai.it (vedi nota 4 in cima al file).
  // ------------------------------------------------------------------
  {
    nome: "Pajaro Loco",
    urlFonte: "https://www.qnhfly.com/en/airfield/157/campo-volo-pajaro-loco",
    comune: "Sesto al Reghena",
    localita: null,
    provincia: "PN",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: null,
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.864722,
    lon: 12.796111,
    quotaM: null,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: null,
    pisteDettaglio: [{ orientamento: "15/33", lunghezzaM: 300, pavimentazione: "Erba" }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/157/campo-volo-pajaro-loco",
  },
  {
    nome: "Aerocampo Prosecco",
    urlFonte: "https://www.qnhfly.com/en/airfield/135/campo-volo-aerocampo-prosecco",
    comune: "Sgonico",
    localita: null,
    provincia: "TS",
    tipo: "Campo volo",
    categoria: "campo-volo",
    codice: null,
    icao: null,
    indirizzo: null,
    cap: null,
    lat: 45.703333,
    lon: 13.759722,
    quotaM: 250,
    piste: 1,
    categorieVolo: [],
    enacDirezione: null,
    fascicolo: null,
    aggiornatoFonte: null,
    pisteDettaglio: [{ orientamento: "13/31", lunghezzaM: 400, pavimentazione: null }],
    fonteDatiPista: "https://www.qnhfly.com/en/airfield/135/campo-volo-aerocampo-prosecco",
  },
  {
    nome: "Elifriulia Ronchi",
    urlFonte: "https://www.webaai.it/it/elisuperfici-enac/friuli_venezia_giulia/elifriulia-ronchi_EA68",
    comune: "Ronchi dei Legionari",
    localita: null,
    provincia: "GO",
    tipo: "Elisuperficie (al suolo)",
    categoria: "elisuperficie",
    codice: null,
    icao: null,
    indirizzo: "Piazzetta Luigi Coloatto 1",
    cap: "34077",
    lat: 45.824881,
    lon: 13.473989,
    quotaM: null,
    piste: null,
    categorieVolo: ["Helicopters"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.2_2024_327",
    aggiornatoFonte: "2024-05-17",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Elifriulia Tolmezzo",
    urlFonte: "https://www.webaai.it/it/elisuperfici-enac/friuli_venezia_giulia/elifriulia-tolmezzo_EA67",
    comune: "Tolmezzo",
    localita: null,
    provincia: "UD",
    tipo: "Elisuperficie (al suolo)",
    categoria: "elisuperficie",
    codice: null,
    icao: null,
    indirizzo: "Via degli Artigiani 24",
    cap: "33028",
    lat: 46.388186,
    lon: 13.033833,
    quotaM: null,
    piste: null,
    categorieVolo: ["Helicopters"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.2_2024_452",
    aggiornatoFonte: "2024-05-17",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
  {
    nome: "Mondschein",
    urlFonte: "https://www.webaai.it/it/elisuperfici-enac/friuli_venezia_giulia/mondschein_EA72",
    comune: "Sappada",
    localita: null,
    provincia: "UD",
    tipo: "Elisuperficie (al suolo)",
    categoria: "elisuperficie",
    codice: null,
    icao: null,
    indirizzo: "Borgata Palù",
    cap: "33012",
    lat: 46.562222,
    lon: 12.683289,
    quotaM: null,
    piste: null,
    categorieVolo: ["Helicopters"],
    enacDirezione: "Nord-Est",
    fascicolo: "5.1.8.2_2024_434",
    aggiornatoFonte: "2024-06-11",
    pisteDettaglio: null,
    fonteDatiPista: null,
  },
];
