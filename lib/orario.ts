// Fase 4 — Performance (06/10/2026): estratto da lib/supermercati.ts.
//
// giornoSettimana() è una funzione pura, senza alcuna dipendenza dal
// dataset Supermercati — serve solo a tradurre una stringa "adesso"
// (formato "YYYY-MM-DDTHH:MM", vedi adessoEuropeRome() in
// lib/farmacie.ts) nel nome del giorno della settimana corrente. Prima
// viveva dentro lib/supermercati.ts insieme a SUPERMERCATI_PER_PROVINCIA
// (611 KB di JSON delle 4 province importati a livello di modulo): chi
// importava SOLO giornoSettimana() da lì (lib/veterinari.ts, per i
// propri calcoli di apertura/chiusura) finiva comunque per includere
// nel proprio bundle client l'intero modulo supermercati.ts — i bundler
// non possono scartare un modulo importato anche quando l'export usato
// è innocuo, perché il resto del modulo (qui, il `.map(normalizza)`
// eseguito a livello di modulo sui 4 JSON) potrebbe avere effetti
// collaterali.
//
// Risultato misurato con `next build` prima di questo file: la rotta
// /veterinari pesava 22.6 kB (quasi lo stesso peso gzip dei 4 JSON
// Veterinari, già di per sé bundlati — vedi nota in lib/veterinari.ts)
// più, nel "First Load JS" complessivo della stessa rotta, un chunk
// condiviso separato da ~30 kB gzip contenente anche i 4 JSON
// Supermercati — dati mai usati da /veterinari, scaricati comunque dal
// visitatore solo per questo singolo import di una funzione di 5 righe.
// Spostando giornoSettimana() in questo file neutro (nessun import di
// dati statici) e facendo importare da qui sia lib/supermercati.ts che
// lib/veterinari.ts, quella dipendenza accidentale scompare.
export type GiornoSettimana =
  | "lunedi"
  | "martedi"
  | "mercoledi"
  | "giovedi"
  | "venerdi"
  | "sabato"
  | "domenica";

// Indice 0 = domenica, come Date.prototype.getUTCDay() — si usa UTC (e
// non il fuso del browser) per via del `Z` esplicito sotto: la stringa
// "adesso" è già stata calcolata nel fuso Europe/Rome da
// adessoEuropeRome(), quindi la sua sola PARTE DATA (prime 10 cifre) usata
// come se fosse UTC dà lo stesso giorno della settimana ovunque si trovi
// il visitatore, evitando un secondo cambio di fuso indesiderato.
const GIORNI: GiornoSettimana[] = [
  "domenica",
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
];

export function giornoSettimana(adesso: string): GiornoSettimana {
  const dataPura = adesso.slice(0, 10);
  const indice = new Date(`${dataPura}T00:00:00Z`).getUTCDay();
  return GIORNI[indice];
}
