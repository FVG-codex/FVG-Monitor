// Mappa comune -> provincia per tutti i 215 comuni del Friuli Venezia
// Giulia (elenco verificato incrociando Wikipedia, ISTAT e i siti
// ufficiali dei singoli comuni, situazione 2026 — nessuna fusione dal
// 1° febbraio 2018 in poi). Usata per ricavare la provincia di un
// percorso turismofvg.it/bike dai comuni attraversati (vedi
// scripts/ingest-light.mjs, sezione TurismoFVG bike), quando il
// dataset non indica la provincia esplicitamente.
//
// Le chiavi sono normalizzate (minuscolo, senza accenti/apostrofi, spazi
// singoli) per un confronto tollerante a piccole differenze di scrittura
// tra fonti diverse — vedi normalizzaComune().

import type { ProvinciaSlug } from "./province";

function normalizzaComune(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove accenti (diacritici combinanti)
    .toLowerCase()
    .replace(/['’`\-\/]/g, " ") // apostrofi, trattini, barre -> spazio
    .replace(/\s+/g, " ")
    .trim();
}

const COMUNI_TRIESTE = [
  "Duino-Aurisina",
  "Monrupino",
  "Muggia",
  "San Dorligo della Valle",
  "Sgonico",
  "Trieste",
];

const COMUNI_GORIZIA = [
  "Capriva del Friuli",
  "Cormons",
  "Doberdò del Lago",
  "Dolegna del Collio",
  "Farra d'Isonzo",
  "Fogliano Redipuglia",
  "Gorizia",
  "Gradisca d'Isonzo",
  "Grado",
  "Mariano del Friuli",
  "Medea",
  "Monfalcone",
  "Moraro",
  "Mossa",
  "Romans d'Isonzo",
  "Ronchi dei Legionari",
  "Sagrado",
  "San Canzian d'Isonzo",
  "San Floriano del Collio",
  "San Lorenzo Isontino",
  "San Pier d'Isonzo",
  "Savogna d'Isonzo",
  "Staranzano",
  "Turriaco",
  "Villesse",
];

const COMUNI_PORDENONE = [
  "Andreis",
  "Arba",
  "Aviano",
  "Azzano Decimo",
  "Barcis",
  "Brugnera",
  "Budoia",
  "Caneva",
  "Casarsa della Delizia",
  "Castelnovo del Friuli",
  "Cavasso Nuovo",
  "Chions",
  "Cimolais",
  "Claut",
  "Clauzetto",
  "Cordenons",
  "Cordovado",
  "Erto e Casso",
  "Fanna",
  "Fiume Veneto",
  "Fontanafredda",
  "Frisanco",
  "Maniago",
  "Meduno",
  "Montereale Valcellina",
  "Morsano al Tagliamento",
  "Pasiano di Pordenone",
  "Pinzano al Tagliamento",
  "Polcenigo",
  "Porcia",
  "Pordenone",
  "Prata di Pordenone",
  "Pravisdomini",
  "Roveredo in Piano",
  "Sacile",
  "San Giorgio della Richinvelda",
  "San Martino al Tagliamento",
  "San Quirino",
  "San Vito al Tagliamento",
  "Sequals",
  "Sesto al Reghena",
  "Spilimbergo",
  "Tramonti di Sopra",
  "Tramonti di Sotto",
  "Travesio",
  "Vajont",
  "Valvasone Arzene",
  "Vito d'Asio",
  "Vivaro",
  "Zoppola",
];

const COMUNI_UDINE = [
  "Aiello del Friuli",
  "Amaro",
  "Ampezzo",
  "Aquileia",
  "Arta Terme",
  "Artegna",
  "Attimis",
  "Bagnaria Arsa",
  "Basiliano",
  "Bertiolo",
  "Bicinicco",
  "Bordano",
  "Buja",
  "Buttrio",
  "Camino al Tagliamento",
  "Campoformido",
  "Campolongo Tapogliano",
  "Carlino",
  "Cassacco",
  "Castions di Strada",
  "Cavazzo Carnico",
  "Cercivento",
  "Cervignano del Friuli",
  "Chiopris-Viscone",
  "Chiusaforte",
  "Cividale del Friuli",
  "Codroipo",
  "Colloredo di Monte Albano",
  "Comeglians",
  "Corno di Rosazzo",
  "Coseano",
  "Dignano",
  "Dogna",
  "Drenchia",
  "Enemonzo",
  "Faedis",
  "Fagagna",
  "Fiumicello Villa Vicentina",
  "Flaibano",
  "Forgaria nel Friuli",
  "Forni Avoltri",
  "Forni di Sopra",
  "Forni di Sotto",
  "Gemona del Friuli",
  "Gonars",
  "Grimacco",
  "Latisana",
  "Lauco",
  "Lestizza",
  "Lignano Sabbiadoro",
  "Lusevera",
  "Magnano in Riviera",
  "Majano",
  "Malborghetto-Valbruna",
  "Manzano",
  "Marano Lagunare",
  "Martignacco",
  "Mereto di Tomba",
  "Moggio Udinese",
  "Moimacco",
  "Montenars",
  "Mortegliano",
  "Moruzzo",
  "Muzzana del Turgnano",
  "Nimis",
  "Osoppo",
  "Ovaro",
  "Pagnacco",
  "Palazzolo dello Stella",
  "Palmanova",
  "Paluzza",
  "Pasian di Prato",
  "Paularo",
  "Pavia di Udine",
  "Pocenia",
  "Pontebba",
  "Porpetto",
  "Povoletto",
  "Pozzuolo del Friuli",
  "Pradamano",
  "Prato Carnico",
  "Precenicco",
  "Premariacco",
  "Preone",
  "Prepotto",
  "Pulfero",
  "Ragogna",
  "Ravascletto",
  "Raveo",
  "Reana del Rojale",
  "Remanzacco",
  "Resia",
  "Resiutta",
  "Rigolato",
  "Rive d'Arcano",
  "Rivignano Teor",
  "Ronchis",
  "Ruda",
  "San Daniele del Friuli",
  "San Giorgio di Nogaro",
  "San Giovanni al Natisone",
  "San Leonardo",
  "San Pietro al Natisone",
  "San Vito al Torre",
  "San Vito di Fagagna",
  "Santa Maria la Longa",
  "Sappada",
  "Sauris",
  "Savogna",
  "Sedegliano",
  "Socchieve",
  "Stregna",
  "Sutrio",
  "Taipana",
  "Talmassons",
  "Tarcento",
  "Tarvisio",
  "Tavagnacco",
  "Terzo di Aquileia",
  "Terzo d'Aquileia", // grafia alternativa usata da alcune fonti — stesso comune
  "Tolmezzo",
  "Torreano",
  "Torviscosa",
  "Trasaghis",
  "Treppo Grande",
  "Treppo Ligosullo",
  "Tricesimo",
  "Trivignano Udinese",
  "Udine",
  "Varmo",
  "Venzone",
  "Verzegnis",
  "Villa Santina",
  "Visco",
  "Zuglio",
];

const COMUNE_PROVINCIA: Record<string, ProvinciaSlug> = {};
for (const nome of COMUNI_TRIESTE) COMUNE_PROVINCIA[normalizzaComune(nome)] = "trieste";
for (const nome of COMUNI_GORIZIA) COMUNE_PROVINCIA[normalizzaComune(nome)] = "gorizia";
for (const nome of COMUNI_PORDENONE) COMUNE_PROVINCIA[normalizzaComune(nome)] = "pordenone";
for (const nome of COMUNI_UDINE) COMUNE_PROVINCIA[normalizzaComune(nome)] = "udine";

/** Provincia del comune indicato, o null se il nome non è riconosciuto. */
export function provinciaDaComune(nomeComune: string): ProvinciaSlug | null {
  return COMUNE_PROVINCIA[normalizzaComune(nomeComune)] ?? null;
}

/**
 * Provincia "prevalente" per un elenco di comuni (es. i comuni
 * attraversati da un percorso ciclabile) — la provincia più frequente
 * tra quelle riconosciute, o null se nessun comune è riconosciuto.
 * Mai un'invenzione: se l'elenco è vuoto o nessun nome corrisponde,
 * restituisce null piuttosto che indovinare.
 */
export function provinciaPrevalente(comuni: string[]): ProvinciaSlug | null {
  const conteggio: Partial<Record<ProvinciaSlug, number>> = {};
  for (const nome of comuni) {
    const p = provinciaDaComune(nome);
    if (!p) continue;
    conteggio[p] = (conteggio[p] ?? 0) + 1;
  }
  let migliore: ProvinciaSlug | null = null;
  let max = 0;
  for (const [p, n] of Object.entries(conteggio) as [ProvinciaSlug, number][]) {
    if (n > max) {
      max = n;
      migliore = p;
    }
  }
  return migliore;
}
