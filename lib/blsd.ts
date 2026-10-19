import type { ProvinciaSlug } from "@/lib/province";

import dati from "@/lib/data/blsd.json";

// Sanità → BLSD / defibrillatori (15/10/2026) — richiesto dall'utente:
// "fare un censimento dei BLSD presenti in regione", con un modulo in
// homepage e una pagina dedicata in Sanità. "BLSD" è in realtà la sigla del
// corso di formazione ("Basic Life Support Defibrillation"); il dispositivo
// si chiama DAE (Defibrillatore Automatico Esterno) — la UI usa "DAE" nei
// testi, "BLSD" resta solo nell'URL/route per aderire alla richiesta letterale.
//
// **Fonte e sue limitazioni (importante, dato di sicurezza/emergenza)**:
// il vero censimento ufficiale regionale esiste — gestito da SORES/118,
// oltre 2.100 dispositivi dichiarati a marzo 2025 (vedi assessore Riccardi,
// presentazione dell'app "DAE FVG") — ma vive SOLO dentro quell'app mobile
// per volontari soccorritori, non è pubblicato come dato aperto né come
// mappa web. Nessuna fonte ufficiale regionale/comunale scrape-friendly è
// stata trovata (IndicePA e open data Regione FVG restano bloccati da
// robots.txt come già riscontrato per altre sezioni del sito).
//
// Questo dataset usa invece OpenAEDMap.org — mappatura comunitaria
// OpenStreetMap (tag emergency=defibrillator), licenza aperta ODbL 1.0,
// fonte indicata dall'utente stesso. L'utente ha scaricato di persona il
// file completo /api/v1/countries/IT.geojson (7.998 punti, tutta Italia:
// il fetch automatico di questa sessione troncava il documento a circa le
// prime 300-400 voci, insufficiente per un censimento) e l'ha allegato alla
// conversazione. Filtrato poi con confini ISTAT reali (pacchetto Python
// italy-geopop, point-in-polygon sui 215 comuni del FVG — non un bounding
// box approssimativo, che avrebbe incluso erroneamente punti di Veneto e
// Trentino-Alto Adige, poi scartati: 397 risultati finali su 565 nel
// bounding box iniziale). **Questo NON è il censimento ufficiale**: è solo
// ciò che la comunità OpenStreetMap ha mappato, quasi certamente un
// sottoinsieme del totale reale — vedi il disclaimer mostrato in pagina.

export type VoceBlsd = {
  osmId: number;
  lat: number;
  lon: number;
  comune: string;
  provincia: ProvinciaSlug;
  provinciaSigla: "UD" | "GO" | "TS" | "PN";
  nome: string | null;
  indirizzo: string | null;
  posizioneDescrizione: string | null;
  accesso: string | null;
  alCoperto: boolean | null;
  orario: string | null;
  operatore: string | null;
  telefono: string | null;
  ultimaVerifica: string | null;
  posizioneApprossimata: boolean;
  osmUrl: string;
};

type RecordGrezzo = {
  osm_id: number;
  lat: number;
  lon: number;
  comune: string;
  provincia: string;
  provincia_sigla: "UD" | "GO" | "TS" | "PN";
  nome: string | null;
  indirizzo: string | null;
  posizione_descrizione: string | null;
  accesso: string | null;
  al_coperto: boolean | null;
  orario: string | null;
  operatore: string | null;
  telefono: string | null;
  ultima_verifica: string | null;
  posizione_approssimata: boolean;
  osm_url: string;
};

type DatasetGrezzo = {
  fonte: string;
  fonte_nota: string;
  data_raccolta: string;
  totale_regione: number;
  records: RecordGrezzo[];
};

const SIGLA_TO_SLUG: Record<"UD" | "GO" | "TS" | "PN", ProvinciaSlug> = {
  UD: "udine",
  GO: "gorizia",
  TS: "trieste",
  PN: "pordenone",
};

function normalizza(r: RecordGrezzo): VoceBlsd {
  return {
    osmId: r.osm_id,
    lat: r.lat,
    lon: r.lon,
    comune: r.comune,
    provincia: SIGLA_TO_SLUG[r.provincia_sigla],
    provinciaSigla: r.provincia_sigla,
    nome: r.nome || null,
    indirizzo: r.indirizzo || null,
    posizioneDescrizione: r.posizione_descrizione || null,
    accesso: r.accesso || null,
    alCoperto: r.al_coperto,
    orario: r.orario || null,
    operatore: r.operatore || null,
    telefono: r.telefono || null,
    ultimaVerifica: r.ultima_verifica || null,
    posizioneApprossimata: r.posizione_approssimata,
    osmUrl: r.osm_url,
  };
}

const DATI = dati as DatasetGrezzo;

export const BLSD: VoceBlsd[] = DATI.records.map(normalizza);

export const BLSD_META = {
  fonte: DATI.fonte,
  fonteNota: DATI.fonte_nota,
  dataRaccolta: DATI.data_raccolta,
  totaleRegione: DATI.totale_regione,
};

export function conteggioBlsdProvincia(p: ProvinciaSlug): number {
  return BLSD.filter((b) => b.provincia === p).length;
}
