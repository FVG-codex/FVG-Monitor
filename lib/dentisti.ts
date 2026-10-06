import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, type StatoApertura } from "@/lib/farmacie";
import { giornoSettimana, type GiornoSettimana } from "@/lib/orario";
import type { FasciaOrariaSettimanale } from "@/lib/supermercati";

import datiTrieste from "@/lib/data/dentisti-trieste.json";

export { adessoEuropeRome, giornoSettimana };
export type { FasciaOrariaSettimanale };

// Sanità → Dentisti & Odontoiatri (06/10/2026). Stesso pattern di dato
// STATICO fornito dall'utente già usato per Veterinari (lib/veterinari.ts)
// e Supermercati (lib/supermercati.ts): nessun ingestX()/Supabase, un
// file JSON per provincia importato direttamente nel bundle via
// resolveJsonModule. `giornoSettimana` importata da "@/lib/orario" (non
// da "@/lib/supermercati") di proposito — vedi la nota "Fase 4 —
// Performance" in lib/veterinari.ts: importarla da lib/supermercati.ts
// trascinerebbe nel bundle client di /dentisti anche l'intero dataset
// Supermercati, mai usato da questa pagina.
//
// Differenza importante rispetto a Veterinari: QUI NON C'È un campo di
// gestione emergenze per singolo record. Il motivo (vedi sessione di
// ricognizione dedicata nel doc di progetto, 06/10/2026, prima di
// scrivere questo file): per i Veterinari ogni clinica si autodichiara
// su un proprio livello di emergenza (modello distribuito, un enum per
// struttura). Per gli odontoiatri a Trieste non esiste un equivalente
// per-struttura — trovato invece un solo servizio centralizzato, il
// Pronto Soccorso Odontoiatrico dell'Ospedale di Cattinara/Maggiore
// (gestito da ASUGI insieme alla Clinica Odontoiatrica universitaria),
// con accesso non libero (serve un codice di urgenza dal medico
// curante, prenotazione CUP, o invio dal Pronto Soccorso generale) — un
// caso a sé, da mostrare in un riquadro unico e separato (non ancora
// costruito: la fonte trovata per i dettagli operativi è un regolamento
// universitario del 2013, da riverificare su una fonte ASUGI aggiornata
// prima di pubblicare orari/contatti/procedura). Fino a quel momento,
// questa pagina non mostra alcuna sezione emergenze.
//
// Dataset iniziale ESPLICITAMENTE NON VERIFICATO (06/10/2026, "ti darò
// tutti i dati verificati" — l'utente ha fornito un primo censimento
// ampliato per costruire la pagina, da sostituire con una versione
// verificata appena pronta): nel file `lib/data/dentisti-trieste.json`,
// `audit.verifiche_residue` elenca tutti e 67 i record come "verifica
// aperta" — niente di diverso dal punto di vista del codice (lo schema
// è comunque completo e valido), ma vale la pena saperlo leggendo
// questo file. TUTTI i record hanno `latitudine`/`longitudine` a
// `null` (nessuna struttura georeferenziata nel censimento iniziale):
// la mappa (DentistiMap.tsx) mostra quindi zero marker per ora e un
// messaggio invece della mappa vuota — non un bug, cambierà da solo
// quando arriveranno le coordinate nella versione verificata.
export type OrarioGiornoDentista = FasciaOrariaSettimanale[] | null;

export type OrariSettimanaDentista = Record<GiornoSettimana, OrarioGiornoDentista>;

export type VoceDentista = {
  id: string;
  nome: string;
  tipoStruttura: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: ProvinciaSlug;
  lat: number | null;
  lon: number | null;
  telefono: string | null;
  email: string | null;
  sito: string | null;
  orari: OrariSettimanaDentista;
  suAppuntamento: boolean | null;
  servizi: string;
  convenzionatoAsugi: boolean | null;
  orariVerificati: boolean;
  note: string | null;
  temporaneamenteChiuso: boolean;
};

const ABBR_TO_SLUG: Record<string, ProvinciaSlug> = { TS: "trieste", UD: "udine", GO: "gorizia", PN: "pordenone" };

type RecordGrezzo = {
  id: string;
  provincia: string;
  temporaneamente_chiuso: boolean;
  nome: string;
  tipo_struttura: string;
  indirizzo: string;
  cap: string;
  comune: string;
  // Opzionali (non solo `| null`): stessa cautela già usata in
  // lib/veterinari.ts per i file forniti dall'utente — una chiave può
  // mancare del tutto invece di essere valorizzata a `null`, anche se
  // il censimento iniziale di Trieste non ne ha nessuna (verificato).
  latitudine?: number | null;
  longitudine?: number | null;
  telefono?: string | null;
  email?: string | null;
  sito_ufficiale?: string | null;
  orari: Record<string, { apre: string; chiude: string }[] | null>;
  su_appuntamento: boolean | null;
  servizi: string;
  convenzionato_asugi: boolean | null;
  orari_verificati: boolean;
  note?: string | null;
};

function normalizza(r: RecordGrezzo): VoceDentista {
  return {
    id: r.id,
    nome: r.nome,
    tipoStruttura: r.tipo_struttura,
    indirizzo: r.indirizzo,
    cap: r.cap,
    comune: r.comune,
    provincia: ABBR_TO_SLUG[r.provincia] ?? "trieste",
    lat: r.latitudine ?? null,
    lon: r.longitudine ?? null,
    telefono: r.telefono || null,
    email: r.email || null,
    sito: r.sito_ufficiale || null,
    orari: r.orari as OrariSettimanaDentista,
    suAppuntamento: r.su_appuntamento,
    servizi: r.servizi,
    convenzionatoAsugi: r.convenzionato_asugi,
    orariVerificati: r.orari_verificati,
    note: r.note || null,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
  };
}

// Solo Trieste per ora (prima provincia, stesso rollout graduale già
// fatto per Veterinari/Supermercati/Notizie) — le altre 3 restano array
// vuoti finché l'utente non fornirà i rispettivi dati verificati.
export const DENTISTI_PER_PROVINCIA: Record<ProvinciaSlug, VoceDentista[]> = {
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: [],
  gorizia: [],
  pordenone: [],
};

export const PROVINCE_DENTISTI_ATTIVE: ProvinciaSlug[] = ["trieste"];

// "Aperta ora"/"Chiusa ora"/"sconosciuto" — stessa identica logica di
// statoAperturaVeterinario() in lib/veterinari.ts (orari settimanali
// ricorrenti, un giorno `null` significa "mai raccolto", non "chiuso").
export function statoAperturaDentista(v: VoceDentista, adesso: string): StatoApertura {
  if (v.temporaneamenteChiuso) return "chiusa";

  const giorno = giornoSettimana(adesso);
  const fasceOggi = v.orari[giorno];
  if (fasceOggi === null) return "sconosciuto";
  if (fasceOggi.length === 0) return "chiusa";

  const oraAdesso = adesso.slice(11, 16);
  const aperta = fasceOggi.some((f) => oraAdesso >= f.apre && oraAdesso < f.chiude);
  return aperta ? "aperta" : "chiusa";
}

// A differenza di formattaFasceGiornoVet() in lib/veterinari.ts, qui le
// 2 etichette per i casi senza fasce orarie sono passate già tradotte
// dal chiamante invece di essere stringhe italiane fisse — lezione
// applicata da una sessione precedente (Meteo, 06/10/2026: lo stesso
// tipo di testo fisso dentro una funzione di lib restava sempre in
// italiano in ogni lingua, mai notato finché l'utente non l'ha
// segnalato). Il chiamante usa `t("orarioNonPubblicato")`/
// `t("chiuso")` (namespace "dentisti").
export function formattaFasceGiornoDentista(
  fasce: OrarioGiornoDentista,
  testoOrarioNonPubblicato: string,
  testoChiuso: string
): string {
  if (fasce === null) return testoOrarioNonPubblicato;
  if (fasce.length === 0) return testoChiuso;
  return fasce.map((f) => `${f.apre}–${f.chiude}`).join(", ");
}
