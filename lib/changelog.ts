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
