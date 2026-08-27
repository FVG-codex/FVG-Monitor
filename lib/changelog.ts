// Registro di tutte le modifiche consegnate a FVG Monitor, più recente
// per prima. Pagina che lo mostra: components/ChangelogPage.tsx (/changelog),
// linkato dal footer di ogni pagina (components/Footer.tsx).
//
// Promemoria per chi lavora su questo progetto (vedi anche README.md e
// claude/fvgmonitor-stato.md): questo file va aggiornato ad OGNI modifica
// consegnata — nuovo modulo, correzione, o cambiamento visibile — con una
// voce nuova in cima, non in coda. Non serve il dettaglio tecnico completo
// (quello resta in README.md/claude/fvgmonitor-stato.md): 1-3 righe che
// descrivano cosa è cambiato per chi usa il sito, non come è stato fatto.
//
// Le voci precedenti al 22/08/2026 non hanno una data esatta registrata
// (nessun repository Git, nessuno storico consultabile) — raggruppate
// sotto "Fase iniziale" invece di inventare una data.

export type VoceChangelog = {
  data: string; // es. "25/08/2026", oppure un'etichetta tipo "Fase iniziale"
  titolo: string;
  dettagli: string[];
};

export const CHANGELOG: VoceChangelog[] = [
  {
    data: "27/08/2026",
    titolo: "Piste ciclabili — comune, provincia e click per evidenziare",
    dettagli: [
      "Ogni percorso mostra ora (quando disponibile) il comune di partenza/arrivo e la provincia. Cliccando il nome di un percorso nell'elenco, ora viene evidenziato e mostrato ingrandito sulla mappa.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Piste ciclabili — nuova sezione",
    dettagli: [
      "Aggiunta la sezione Piste ciclabili (/piste-ciclabili): mappa ed elenco dei percorsi ciclabili trasmessi dai Comuni alla Regione, fonte Regione FVG. Copertura parziale, non l'intera rete regionale — dichiarato in pagina.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Farmacie — corretto il pallino \"Chiusa ora\" mostrato per errore",
    dettagli: [
      "In alcuni casi (dati non ancora aggiornati per la giornata) una farmacia poteva risultare \"Chiusa ora\" anche durante il proprio orario di apertura. Ora, quando i dati non sono ancora affidabili per oggi, non viene mostrato alcun pallino invece di uno stato sbagliato.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Corretto un problema per cui la mappa copriva il menù",
    dettagli: [
      "Su alcune pagine con mappa (es. Farmacie), aprendo il menù di navigazione la mappa poteva comparirci sopra invece che sotto. Corretto su tutte le pagine con mappa; nella pagina Farmacie l'elenco ora compare anche prima della mappa.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Ingestione — corretto un possibile blocco delle esecuzioni programmate",
    dettagli: [
      "Nessun cambiamento visibile sul sito: un'esecuzione programmata era rimasta bloccata su GitHub (in parte per un disservizio della piattaforma, verificato su githubstatus.com). Aggiunti timeout più stretti e una regola che cancella un'esecuzione ancora in corso quando ne parte una nuova, per evitare che si accumulino in futuro.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — filtro per comune dentro ogni provincia",
    dettagli: [
      "Dopo aver scelto una provincia, compare ora un secondo gruppo di tastini (stessa grafica di quelli provincia) con tutti i comuni di quella provincia, per filtrare l'elenco e la mappa a un solo comune.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — indicatore \"Aperta ora\" / \"Chiusa ora\"",
    dettagli: [
      "Ogni farmacia mostra ora un pallino verde/rosso con l'etichetta \"Aperta ora\" o \"Chiusa ora\", calcolato in base all'orario di oggi — sia nell'elenco che nella mappa.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — corretto un bug che azzerava tutte le pagine",
    dettagli: [
      "Nessuna farmacia compariva in nessuna provincia (bug segnalato dall'utente): un errore nel calcolo della provincia scartava ogni riga del dataset. Corretto — ora tutte le farmacie compaiono correttamente.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — divisa in \"Tutte le farmacie\" e \"Farmacie di turno\"",
    dettagli: [
      "La voce \"Farmacie\" nel menù apre ora un hub con due sezioni, come per Sport e Strutture ricettive: \"Tutte le farmacie\" (elenco completo con orari di oggi e contatti) e \"Farmacie di turno\" (solo le aperture straordinarie di oggi, come prima).",
      "Aggiunta la ricerca per nome o comune su entrambe le pagine.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Agriturismi — contatti più completi da turismofvg.it",
    dettagli: [
      "Per gli Agriturismi, indirizzo/telefono/email/sito (e, quando presenti, titolare e CIN) vengono ora presi da turismofvg.it quando disponibili — più ricchi e più affidabili del solo abbinamento OpenStreetMap, che resta il ripiego per gli altri 7 tipi di struttura ricettiva.",
      "Aggiornamento incrementale: qualche decina di schede nuove ogni 15 minuti, non tutte insieme — la copertura completa arriva nell'arco di alcune ore dal primo avvio, poi resta sempre aggiornata.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Strutture ricettive — indirizzo e telefono da OpenStreetMap",
    dettagli: [
      "Dove disponibile, le schede di Strutture ricettive mostrano ora anche indirizzo e telefono (etichettati \"OSM\"), trovati incrociando l'elenco della Regione con OpenStreetMap — copertura parziale e diversa per tipo, non un dato ufficiale.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Strutture ricettive — nuova sezione, 8 tipi",
    dettagli: [
      "Aggiunto l'hub Strutture ricettive (/strutture-ricettive): Bed & Breakfast, Affittacamere, Campeggi, Agriturismi, Alberghi Diffusi, Strutture Sociali, Marina, Rifugi Alpini — oltre 2100 strutture in tutta la regione, ciascuna con la propria pagina, fonte Regione FVG.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie di turno — nuova sezione",
    dettagli: [
      "Aggiunta la sezione Farmacie di turno (/farmacie): mappa ed elenco, con un tab per provincia, delle farmacie con apertura straordinaria oggi in Friuli Venezia Giulia, fonte Regione FVG.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Aviazione — orientamento e lunghezza pista, elisuperfici",
    dettagli: [
      "Aggiunti orientamento (QFU), lunghezza e pavimentazione della pista per 22 delle strutture già presenti, fonte QNH Fly.",
      "Aggiunte 2 aviosuperfici/campi volo e 3 elisuperfici non ancora censite, per un totale di 32 strutture (da 27).",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Aviazione — nuova sezione, database aviostrutture FVG",
    dettagli: [
      "Aggiunta la sezione Aviazione (/aviazione): mappa ed elenco filtrabile di 27 aeroporti, aviosuperfici e campi volo del Friuli Venezia Giulia, fonte WebAAI.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Registro modifiche — nuova pagina, link in ogni footer",
    dettagli: [
      "Aggiunta questa pagina (/changelog) e un footer condiviso da tutte le pagine del sito, prima presente solo in homepage.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Sci — risultati completi delle gare passate",
    dettagli: [
      "Le gare già svolte nel calendario Sci si possono aprire per vedere i risultati di ogni singola gara (posizione, atleta, società, tempo, punti).",
      "Corretto lo stato mostrato per ogni gara (\"Svolta\" / \"In programma\"): ora calcolato dalla data, invece di un campo della fonte che non si aggiornava mai per le gare passate.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Sci — nuovo modulo, calendario gare FVG",
    dettagli: [
      "Aggiunta la sezione Sci in Sport (/sci): calendario delle gare del Comitato FVG della FISI (fondo, salto, combinata nordica, biathlon e altre discipline invernali), con un tab per disciplina.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Tennis — corretti i duplicati, classifiche divise per categoria",
    dettagli: [
      "Risolto un bug per cui alcuni giocatori comparivano più volte nelle classifiche.",
      "Le classifiche sono ora divise anche per categoria di grado (2ª/3ª/4ª), non solo per genere: 6 classifiche invece di 2.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Tennis — nuovo modulo, classifica Assoluti FVG",
    dettagli: [
      "Aggiunta la sezione Tennis in Sport (/tennis): classifica dei migliori tesserati FVG in categoria Assoluti, fonte FITP.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Avviato il collegamento del dominio monitor.fvg.it",
    dettagli: [
      "Registrato il dominio monitor.fvg.it e avviata la configurazione DNS per collegarlo al sito (in corso).",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Accessibilità — contrasto, stati, navigazione da tastiera",
    dettagli: [
      "Corretto il contrasto di diversi colori sotto la soglia minima leggibile, aggiunte etichette testuali dove uno stato (es. ritardo, superamento soglia) era indicato solo dal colore.",
      "Aggiunti titoli di pagina, un tasto per saltare direttamente al contenuto, e indicazioni per chi naviga da tastiera o con uno screen reader su menu, bottoni a scheda e mappe.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Homepage — pannelli uniti per ridurre lo spazio vuoto",
    dettagli: [
      "Uniti i pannelli \"Bora · Vento\" e \"Pioggia\", e i pannelli \"Mare\" e \"Fiumi\", in un unico riquadro ciascuno.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Adattamento a schermi piccoli",
    dettagli: [
      "Corretti diversi punti in cui testo o riquadri traboccavano su schermi stretti (telefono) invece di andare a capo o accorciarsi.",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuova sezione Trasporti — Voli, Ferrovie, Autobus",
    dettagli: [
      "Aggiunta la pagina Trasporti (/trasporti): arrivi/partenze di Trieste Airport, stato in tempo reale di 7 stazioni ferroviarie e 6 gruppi di fermate autobus (Trieste, Udine, Gorizia, Pordenone, Trieste Airport, Monfalcone).",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuovi moduli — Pollini, Carburanti, Balneazione",
    dettagli: [
      "Aggiunto il monitoraggio pollini (4 stazioni), i prezzi medi regionali dei carburanti e la qualità delle acque di balneazione (66 punti in tutta la regione).",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuova sezione Sport — Calcio, Basket, Baseball & Softball",
    dettagli: [
      "Aggiunto l'hub Sport (/sport) con calendari e classifiche di 9 campionati di calcio, basket e baseball/softball regionali.",
    ],
  },
  {
    data: "Fase iniziale",
    titolo: "Avvio del sito",
    dettagli: [
      "Prima versione: homepage d'insieme e 4 pagine provincia (Trieste, Udine, Gorizia, Pordenone) con meteo, allerte Protezione Civile, qualità dell'aria, viabilità e notizie regionali.",
      "Data esatta non registrata — questo registro comincia a tenere traccia sistematica dal 22/08/2026.",
    ],
  },
];
