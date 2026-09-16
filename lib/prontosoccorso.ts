import type { ProvinciaSlug } from "@/lib/province";

// Sanità → Pronto Soccorso in tempo reale (16/09/2026, richiesto
// dall'utente: "probabilmente una delle pagine con maggiore utilità
// reale del portale"). A differenza di Supermercati/Veterinari (dati
// STATICI forniti dall'utente), questo è un vero modulo LIVE — stesso
// pattern architetturale di Farmacie/Baseball/Meteo/ecc.: una funzione
// ingestProntoSoccorso() in scripts/ingest-light.mjs interroga la fonte
// ogni 15 minuti e scrive un'unica snapshot Supabase ("pronto-soccorso"),
// letta qui lato client.
//
// Fonte: un endpoint pubblico NON documentato di
// servizionline.sanita.fvg.it — la pagina ufficiale
// (https://servizionline.sanita.fvg.it/psonline/, quella citata
// dall'utente insieme a un comunicato stampa del Presidente della
// Regione) è una SPA il cui HTML iniziale non contiene alcun dato:
// WebFetch e un tentativo diretto da questa sandbox erano entrambi
// falliti (stesso blocco di rete già visto per altre fonti live di
// questo progetto). L'endpoint reale è stato individuato dall'UTENTE
// tramite DevTools → Rete del proprio browser (stesso metodo già
// riuscito in passato per Autobus TPL FVG, Tennis, Sci, "Pazzi per il
// meteo Goriziano") e comunicato direttamente in chat:
//   GET https://servizionline.sanita.fvg.it/tempiAttesaService/tempiAttesaPs?datetime=<epoch ms>
// Nessuna autenticazione richiesta; `datetime` sembra un semplice
// cache-buster (non ne è stato verificato l'effetto). Un secondo URL
// fornito dall'utente
// (.../psonline/tempiAttesaStruttura/codice/tutti) risponde solo la
// stringa "OK" via GET — probabilmente un endpoint POST-only, non
// utilizzato: l'endpoint sopra da solo contiene già tutto il
// necessario (elenco completo delle sedi, coordinate, indirizzi,
// pazienti per codice colore).
//
// Struttura grezza della fonte (verificata su una risposta reale
// completa, salvata e ispezionata prima di scrivere questo file):
//   { dataAggiornamento: <epoch ms>, aziende: [ { id, descrizione,
//     prontoSoccorsi: [ { id, descrizione, dipartimenti: [ { id,
//     descrizione, info, latitudine, longitudine, indirizzo, localita,
//     comune, telefono, codiciColore: [ { id, descrizione, rgb,
//     priorita, situazionePazienti: { numeroPazienti,
//     numeroPazientiInVisita, numeroPazientiInAttesa, mediaAttesa } } ],
//     numeroPazienti } ] } ] } ] }
// `ingestProntoSoccorso()` APPIATTISCE questa gerarchia a 4 livelli
// (azienda → prontoSoccorso → dipartimento → codiceColore) in un unico
// array `dipartimenti` (17 sedi fisiche reali nel campione verificato):
// il raggruppamento per azienda sanitaria (Burlo Garofolo / AS Friuli
// Occidentale / ASU Friuli Centrale / ASU Giuliano Isontina) non è mai
// stato richiesto dall'utente e non corrisponde alle 4 province già
// usate come filtro in tutto il resto del sito — la provincia di
// ciascuna sede viene invece derivata qui sotto da
// PROVINCIA_PER_COMUNE, un elenco FISSO di comuni noti (non un mapping
// generico): il numero di sedi fisiche di pronto soccorso in regione
// cambia raramente, e un comune non in elenco è trattato come
// `null` (provincia sconosciuta) invece di un'assunzione errata.
//
// `telefono`: SEMPRE `null` nella fonte per tutte e 17 le sedi del
// campione verificato — un campo dichiarato nello schema ma mai
// valorizzato dalla Regione. Il numero è stato raccolto manualmente da
// fonti ufficiali (asugi/asufc/asfo/burlo .sanita.fvg.it, MAI directory
// non ufficiali) per 16 sedi su 17 — per il Punto di Primo Intervento
// di Grado non è stato trovato un numero dedicato pubblicato (solo
// quello del Distretto Basso Isontino, non specifico del PPI): vedi
// TELEFONI_PRONTO_SOCCORSO sotto, tabella statica keyed per id
// dipartimento (l'id numerico della fonte, stabile finché la sede
// fisica resta la stessa — stesso principio già usato per
// BLOCCHI_AUTOBUS/STAZIONI_TRENI).
//
// Nota sul campo `info` (es. "Orario di apertura: dalle 08:00 alle
// 19:30" per il Pronto Soccorso Maggiore di Trieste, "Punto di primo
// soccorso stagionale" per Lignano): testo libero della fonte, mostrato
// così com'è — importante perché NON tutte le 17 sedi sono un pronto
// soccorso H24 a pieno regime, alcune hanno orari ridotti o sono
// stagionali, e i pazienti-in-attesa/trattamento vanno letti con questo
// contesto.

export type SituazionePazientiColore = {
  numeroPazienti: number;
  numeroPazientiInVisita: number;
  numeroPazientiInAttesa: number;
  mediaAttesa: string; // "HH:MM"
};

export type CodiceColore = {
  id: number;
  descrizione: string; // "Rosso" | "Arancione" | "Azzurro" | "Verde" | "Bianco"
  rgb: string; // es. "FF0000", senza "#" — valore fornito dalla fonte
  priorita: number; // 1 (massima urgenza/prontezza) … 5
  situazionePazienti: SituazionePazientiColore;
};

export type DipartimentoPS = {
  id: number;
  nome: string;
  info: string | null;
  lat: number | null;
  lon: number | null;
  indirizzo: string | null;
  localita: string | null;
  comune: string | null;
  codiciColore: CodiceColore[];
  totalePazienti: number;
};

export type SnapshotProntoSoccorso = {
  dataAggiornamento: number; // epoch ms, dalla fonte
  dipartimenti: DipartimentoPS[];
};

const PROVINCIA_PER_COMUNE: Record<string, ProvinciaSlug> = {
  Trieste: "trieste",
  Gorizia: "gorizia",
  Monfalcone: "gorizia",
  Grado: "gorizia",
  Udine: "udine",
  Palmanova: "udine",
  Latisana: "udine",
  "Lignano Sabbiadoro": "udine",
  Tolmezzo: "udine",
  "San Daniele del Friuli": "udine",
  Pordenone: "pordenone",
  Spilimbergo: "pordenone",
  "San Vito al Tagliamento": "pordenone",
};

export function provinciaDipartimento(d: DipartimentoPS): ProvinciaSlug | null {
  return d.comune ? PROVINCIA_PER_COMUNE[d.comune] ?? null : null;
}

// Vedi nota estesa sopra — raccolta manuale il 16/09/2026, fonti
// ufficiali citate nel commento di ciascuna riga.
const TELEFONI_PRONTO_SOCCORSO: Record<number, string> = {
  63576: "040 3785333", // Burlo (PS pediatrico) — burlo.trieste.it, guida servizi
  68692: "0427 595512", // Spilimbergo — asfo.sanita.fvg.it/it/servizi/pronto_soccorso.html
  32487: "0434 399293", // Pordenone — asfo.sanita.fvg.it/it/servizi/pronto_soccorso.html
  46978: "0434 399422", // Pediatrico Pordenone — asfo.sanita.fvg.it, pagina dedicata
  68693: "0434 841260", // San Vito al Tagliamento — asfo.sanita.fvg.it/it/servizi/pronto_soccorso.html
  38825: "0432 921245", // Palmanova — asufc.sanita.fvg.it/it/servizi/pronto_soccorso.html
  38341: "0431 529201", // Latisana — asufc.sanita.fvg.it/it/servizi/pronto_soccorso.html
  37372: "0431 71001", // Lignano (PPI stagionale) — asufc.sanita.fvg.it, pagina dedicata SS PPI Lignano
  37219: "0433 488418", // Tolmezzo — asufc.sanita.fvg.it, pagina dedicata PS Tolmezzo
  51221: "0432 949210", // San Daniele — asufc.sanita.fvg.it/it/servizi/pronto_soccorso.html
  52858: "0432 552652", // Udine — asufc.sanita.fvg.it/it/servizi/pronto_soccorso.html
  52857: "0432 559259", // Pediatrico Udine — asufc.sanita.fvg.it, pagina dedicata Clinica Pediatrica
  54932: "0481 594584", // Gorizia — asugi.sanita.fvg.it, pagina dedicata PS Med. Urgenza Gorizia
  54960: "0481 487340", // Monfalcone — asugi.sanita.fvg.it, Carta dei Servizi PS Monfalcone 2025 (PDF)
  61857: "040 3994563", // Cattinara (Trieste) — asugi.sanita.fvg.it, pagina dedicata (recapito "accoglimento")
  61860: "040 3992736", // Maggiore (Trieste) — asugi.sanita.fvg.it, pagina dedicata (recapito "accoglimento")
  // 70960 Punto di Primo Intervento Grado: nessun numero dedicato
  // trovato su fonte ufficiale (solo il Distretto Basso Isontino,
  // 0431 897920, non specifico del PPI) — lasciato non valorizzato
  // invece di mostrare un numero che potrebbe non rispondere per
  // un'urgenza al PPI stesso.
};

export function telefonoDipartimento(d: DipartimentoPS): string | null {
  return TELEFONI_PRONTO_SOCCORSO[d.id] ?? null;
}

export function telHref(telefono: string): string {
  return telefono.split(";")[0].trim().replace(/\s+/g, "");
}

export function mapsDirectionsHref(d: DipartimentoPS): string | null {
  if (d.lat === null || d.lon === null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}`;
}

// Totali per sede, sommati sui 5 codici colore — la fonte espone già un
// `numeroPazienti` totale per dipartimento, ma NON un totale
// "in attesa"/"in trattamento" già sommato: va calcolato qui.
export function totaliDipartimento(d: DipartimentoPS): { inAttesa: number; inTrattamento: number } {
  let inAttesa = 0;
  let inTrattamento = 0;
  for (const c of d.codiciColore) {
    inAttesa += c.situazionePazienti.numeroPazientiInAttesa;
    inTrattamento += c.situazionePazienti.numeroPazientiInVisita;
  }
  return { inAttesa, inTrattamento };
}

// Stile badge per codice colore — usa il valore "rgb" fornito DIRETTAMENTE
// dalla fonte come sfondo (stesso colore ufficiale del sistema di triage
// regionale, non un'approssimazione con i token colore del sito), con un
// testo di contrasto fisso per i 5 valori noti e un bordo sempre presente
// (necessario per "Bianco", altrimenti invisibile sia su panel chiaro che
// scuro). #10262A è lo stesso valore già usato come "on-accent" nel resto
// del sito (tailwind.config.ts) — riusato qui invece di introdurre un
// nuovo colore, per coerenza visiva.
const TESTO_PER_COLORE: Record<string, string> = {
  Rosso: "#FFFFFF",
  Arancione: "#241B04", // stesso testo scuro già usato su sfondo arancione in lib/veterinari.ts
  Azzurro: "#10262A",
  Verde: "#FFFFFF",
  Bianco: "#10262A",
};

export function stileBadgeColore(c: CodiceColore): { backgroundColor: string; color: string; borderColor: string } {
  const bg = `#${c.rgb}`;
  return {
    backgroundColor: bg,
    color: TESTO_PER_COLORE[c.descrizione] ?? "#10262A",
    borderColor: c.descrizione === "Bianco" ? "#9DB3AE" : bg,
  };
}

// "Aggiornato alle HH:MM" in Europe/Rome, dall'epoch ms della fonte.
export function formattaOraAggiornamento(epochMs: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(epochMs));
}

// Guardia dato non aggiornato di recente (stesso principio già applicato
// a Farmacie/Meteo: un'esecuzione GitHub Actions in ritardo non deve
// mostrare in silenzio un dato vecchio come se fosse "adesso" — qui
// particolarmente delicato trattandosi di tempi di attesa in pronto
// soccorso). Soglia 30 minuti: il job gira ogni 15, quindi un dato più
// vecchio di 30 minuti indica quasi certamente un'esecuzione saltata.
export function datoObsoleto(epochMs: number): boolean {
  return Date.now() - epochMs > 30 * 60 * 1000;
}
