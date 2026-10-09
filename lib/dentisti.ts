import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, type StatoApertura } from "@/lib/farmacie";
import { giornoSettimana, type GiornoSettimana } from "@/lib/orario";
import type { FasciaOrariaSettimanale } from "@/lib/supermercati";

import datiTrieste from "@/lib/data/dentisti-trieste.json";
import datiGorizia from "@/lib/data/dentisti-gorizia.json";
import datiUdine from "@/lib/data/dentisti-udine.json";

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
// Storia della sezione Emergenze/Urgenze (importante per capire perché
// il codice sotto esiste, visto che la decisione iniziale era opposta):
// la ricognizione originale (06/10/2026, prima di scrivere questo file)
// aveva concluso che QUI NON avrebbe dovuto esserci un campo di gestione
// emergenze per singolo record come per Veterinari — a Trieste non era
// emerso un equivalente per-struttura, solo un servizio centralizzato
// (il Pronto Soccorso Odontoiatrico di Cattinara/Maggiore, fonte un
// regolamento universitario del 2013 da riverificare). Il dataset di
// Gorizia (09/10/2026) ha introdotto `gestione_urgenze` per-record — a
// quel punto conservato nel modello dati ma non ancora mostrato,
// un'altra AskUserQuestion di mezzo. **Decisione finale (09/10/2026,
// "possiamo usare la gestione urgenze come abbiamo fatto per i
// veterinari")**: sì, con lo stesso trattamento visivo di Veterinari —
// riquadro Emergenze in cima alla pagina, badge per struttura, marker
// mappa in evidenza — vedi `LIVELLO_URGENZE_DENTISTA`/
// `vociUrgenzeDentista()` sotto. Differenza voluta rispetto a
// Veterinari: qui il dato sorgente non è un enum a 9 valori ma un
// oggetto con solo `disponibile`/`h24` — quindi solo 3 livelli invece di
// 9, niente "sinonimi da riconciliare" fra province. Il riquadro unico
// sul Pronto Soccorso Odontoiatrico di Cattinara (Trieste) resta
// comunque un progetto separato e ancora in sospeso: per Trieste
// `gestioneUrgenze` è `null` su ogni record (la chiave non esiste nel
// file), quindi lì il riquadro Emergenze mostrerà sempre "nessuna
// struttura dichiara" finché non arriveranno dati equivalenti o quel
// riquadro dedicato.
//
// Trieste — dataset AGGIORNATO con la versione "verificata" fornita
// dall'utente (08/10/2026, sostituisce il censimento iniziale del
// 06/10/2026 — vedi doc di progetto per i dettagli di entrambe le
// consegne). Attenzione a cosa è cambiato e cosa NON è cambiato in
// questo passaggio, perché il file non è uniformemente "verificato"
// come l'etichetta suggerirebbe: 61 record (67 → 61, 6 esclusi per
// duplicati/attività cessate/decesso del professionista — vedi `audit.
// record_esclusi`), con 7 conflitti di fonte risolti e `data_verifica`
// compilata per ogni record. `orari_verificati` è ora genuinamente
// misto (20 true / 41 false, non più tutto un unico valore come nel
// file iniziale). MA: `audit.verifiche_residue` nel file elenca ancora
// 66 voci come "verifica aperta" (quasi tutte per "coordinate
// mancanti") — non sincronizzato con i 61 record attuali (contiene
// ancora 5 id che non esistono più nei record, es. TS-DEN-053/058/063 —
// esclusi ma non rimossi da quella lista), e `audit.copertura_comuni`
// riporta ancora i vecchi conteggi 60/2/5 (totale 67) invece di 55/2/4
// (totale 61) — disallineamento interno al file stesso, non usato dal
// codice di questa pagina (nessun componente legge `audit.*`) ma degno
// di nota se si ispeziona il file. Soprattutto: TUTTI e 61 i record
// hanno ancora `latitudine`/`longitudine` a `null` — nessuna struttura
// georeferenziata nemmeno in questa versione.
//
// Gorizia — seconda provincia attivata (09/10/2026), `dentisti-
// gorizia-candidati.json` (34 record), consegnata dall'utente con un
// grado di cautela diverso da Trieste ("dovrebbero essere verificati",
// non un'affermazione netta). File di qualità sensibilmente più alta
// del censimento Trieste: `audit.copertura_comuni` qui corrisponde
// esattamente ai conteggi reali per comune (nessun disallineamento), 2
// record esclusi con motivazione dettagliata e un conflitto rimasto
// aperto correttamente escluso dai 34 pubblicati (non incluso nel
// file). **Prima differenza reale rispetto a Trieste: le coordinate
// sono presenti su tutti e 34 i record** (`audit.avanzamento_
// coordinate`: 34/34 "coordinate_accettate") — la mappa di Gorizia
// mostrerà quindi marker veri, a differenza di Trieste che resta senza.
// **Seconda differenza: un nuovo campo per-record, `gestione_urgenze`**
// (oggetto con `disponibile`/`h24`/`telefono`/`note`), compilato su 6
// dei 34 record — i 2 ambulatori pubblici ASUGI (Gorizia e Monfalcone,
// fonte ASUGI 2026) più 4 studi privati con reperibilità autodichiarata.
// Questo è concettualmente il modello DISTRIBUITO già usato per
// Veterinari (gestione_emergenze per singola struttura), che per
// Dentisti era stato scartato nella ricognizione originale a favore di
// un riquadro unico e centralizzato (vedi sopra e doc di progetto).
// **Decisione del 09/10/2026 (prima AskUserQuestion)**: il campo viene
// normalizzato e conservato nel modello dati (campo `gestioneUrgenze`
// su `VoceDentista`, `null` per Trieste che non lo possiede affatto) ma
// NON ancora mostrato. **Superata subito dopo, stesso giorno** — vedi
// il commento sopra: l'utente ha chiesto di trattarlo come Veterinari,
// quindi ora C'È un riquadro Emergenze, badge e colorazione mappa.
//
// Udine — terza provincia attivata (09/10/2026), `dentisti-provincia-
// udine-completo.json` (34 record, chiave top-level `record` SINGOLARE —
// a differenza di `records` plurale usato da Trieste/Gorizia, attenzione
// a questa incoerenza se si aggiungono altre province). Consegnato in due
// parti: prima un file di sole 3 correzioni di indirizzo (non un dataset
// completo — segnalato all'utente come tale, senza pubblicarlo), poi
// questo file completo che le incorpora già (verificato campo per campo).
// Qualità interna buona: tutti i conteggi dichiarati in `statistiche`
// (sedi_pubbliche 14, sedi_private 20, orari_verificati 22, coordinate
// 34/34, pronto_soccorso_odontoiatrico_confermato 2) corrispondono
// esattamente ai dati effettivi, nessun disallineamento come invece
// trovato nel file iniziale di Trieste. Zona servita da **ASUFC**, non
// ASUGI (a differenza di Trieste/Gorizia) — per questo `servizi` e
// `convenzionato_asugi` sono interamente ASSENTI dai record di Udine
// (0/34, non un errore: il campo `convenzionato_asugi` è semanticamente
// specifico di ASUGI), gestiti sotto con fallback sicuri (`servizi` →
// stringa vuota, `convenzionatoAsugi` → `null`). Tre divergenze di
// schema rispetto a Trieste/Gorizia, tutte gestite in `normalizza()`/
// `RecordGrezzo` per evitare crash:
// 1. `orari` può essere interamente `null` per un intero record (12/34),
//    non solo `null` per singolo giorno come nelle altre due province —
//    i `note_qualita` del file sono espliciti: "Gli orari null non
//    devono essere interpretati come struttura chiusa" (va trattato come
//    "sconosciuto" per ogni giorno, non "chiuso"). Sostituito con un
//    oggetto che ha tutti i 7 giorni a `null`.
// 2. `telefono` arriva come array di stringhe (32/34 record), stringa
//    semplice (1) o `null` (1) — normalizzato con `normalizzaTelefonoEmail()`
//    sotto, che unisce un eventuale array con "; " (stessa convenzione
//    già usata per i numeri multipli, vedi `telHref()` in
//    `DentistiPage.tsx`).
// 3. `email` è SEMPRE un array (anche vuoto) — stessa funzione di
//    normalizzazione, per uniformità di tipo anche se il campo non è
//    ancora usato nell'interfaccia.
// `gestione_urgenze` qui è presente su TUTTI i 34 record (non solo un
// sottoinsieme come a Gorizia) con `disponibile` quasi sempre `null`
// ("informazione non pubblicata o non verificata", per i `note_qualita`
// del file — non equivale a "non disponibile") — già gestito
// correttamente da `livelloUrgenzeDentista()` sotto, che tratta sia
// `null` che `false` come "non_dichiarata". Il JSON di Udine include
// anche 2 sotto-campi in più (`pronto_soccorso`, `accesso_diretto`) non
// modellati in `GestioneUrgenzeDentista`/`RecordGrezzo`: ignorati, non
// serve leggerli per il trattamento a 3 livelli già in uso.
export type OrarioGiornoDentista = FasciaOrariaSettimanale[] | null;

export type OrariSettimanaDentista = Record<GiornoSettimana, OrarioGiornoDentista>;

// Campo per-record "gestione_urgenze" introdotto dal dataset di Gorizia
// (09/10/2026) — assente del tutto per Trieste (non solo `null`: la
// chiave non esiste nei suoi record). Normalizzato e conservato qui
// per i dati, ma deliberatamente NON ancora letto da nessun componente
// — vedi la nota estesa più sopra sulla decisione presa con l'utente.
export type GestioneUrgenzeDentista = {
  disponibile: boolean | null;
  h24: boolean;
  telefono: string | null;
  note: string | null;
};

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
  gestioneUrgenze: GestioneUrgenzeDentista | null;
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
  // `string | string[] | null`: Udine (09/10/2026) consegna questi due
  // campi come array di stringhe nella quasi totalità dei record (anche
  // `email`, sempre) invece dello scalare semplice usato da Trieste/
  // Gorizia — vedi `normalizzaTelefonoEmail()` sotto e il commento estesa
  // in testa al file.
  telefono?: string | string[] | null;
  email?: string | string[] | null;
  sito_ufficiale?: string | null;
  // `| null` sull'intero oggetto (non solo sui singoli giorni): Udine è
  // la prima provincia a consegnare `orari: null` per un intero record
  // (12/34) — vedi il commento estesa in testa al file.
  orari: Record<string, { apre: string; chiude: string }[] | null> | null;
  su_appuntamento: boolean | null;
  // Opzionali: assenti del tutto nei record di Udine (zona ASUFC, non
  // ASUGI) — vedi il commento estesa in testa al file.
  servizi?: string;
  convenzionato_asugi?: boolean | null;
  orari_verificati: boolean;
  note?: string | null;
  // Presente solo nei record di Gorizia (assente del tutto in quelli
  // di Trieste) — vedi il commento estesa sopra. Altri campi del
  // dataset Gorizia (`verifica`, `verifica_coordinate`, `comuni_scope`
  // a livello di `audit`) non sono qui: non servono al sito, solo alla
  // tracciabilità del processo di verifica dell'utente.
  gestione_urgenze?: {
    disponibile: boolean | null;
    h24: boolean;
    telefono: string | null;
    note: string | null;
  } | null;
};

// Giorno "sconosciuto" per tutti e 7 i giorni — usato quando `orari` è
// `null` sull'intero record (solo Udine, 09/10/2026, 12/34 record): i
// `note_qualita` del file sono espliciti ("Gli orari null non devono
// essere interpretati come struttura chiusa"), quindi ogni giorno deve
// risultare "sconosciuto" (array `null`) e non "chiuso" (array vuoto).
const ORARI_SCONOSCIUTI: OrariSettimanaDentista = {
  lunedi: null,
  martedi: null,
  mercoledi: null,
  giovedi: null,
  venerdi: null,
  sabato: null,
  domenica: null,
};

// `telefono`/`email` possono arrivare come stringa semplice, array di
// stringhe o `null` (Udine, 09/10/2026 — vedi commento estesa in testa
// al file). Un array viene unito con "; ", la stessa convenzione già
// usata per i numeri multipli in un singolo campo stringa (vedi
// `telHref()` in `DentistiPage.tsx`).
function normalizzaTelefonoEmail(valore: string | string[] | null | undefined): string | null {
  if (!valore) return null;
  if (Array.isArray(valore)) {
    const filtrati = valore.map((v) => v.trim()).filter(Boolean);
    return filtrati.length > 0 ? filtrati.join("; ") : null;
  }
  return valore || null;
}

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
    telefono: normalizzaTelefonoEmail(r.telefono),
    email: normalizzaTelefonoEmail(r.email),
    sito: r.sito_ufficiale || null,
    orari: r.orari ? (r.orari as OrariSettimanaDentista) : ORARI_SCONOSCIUTI,
    suAppuntamento: r.su_appuntamento,
    servizi: r.servizi ?? "",
    convenzionatoAsugi: r.convenzionato_asugi ?? null,
    orariVerificati: r.orari_verificati,
    note: r.note || null,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
    gestioneUrgenze: r.gestione_urgenze ?? null,
  };
}

// Trieste, Gorizia e Udine attive (rollout graduale già fatto per
// Veterinari/Supermercati/Notizie) — Pordenone resta array vuoto finché
// l'utente non fornirà i rispettivi dati. Nota: il file di Udine usa la
// chiave top-level `record` SINGOLARE, a differenza di `records` plurale
// per Trieste/Gorizia — vedi il commento estesa in testa al file.
export const DENTISTI_PER_PROVINCIA: Record<ProvinciaSlug, VoceDentista[]> = {
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: (datiUdine.record as RecordGrezzo[]).map(normalizza),
  gorizia: (datiGorizia.records as RecordGrezzo[]).map(normalizza),
  pordenone: [],
};

export const PROVINCE_DENTISTI_ATTIVE: ProvinciaSlug[] = ["trieste", "gorizia", "udine"];

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

// Livelli derivati da `gestioneUrgenze` (vedi commento esteso in testa
// al file). A differenza di `GestioneEmergenza` in lib/veterinari.ts
// (9 valori letti direttamente da un enum nel JSON), qui i livelli sono
// CALCOLATI da due booleani (`disponibile`/`h24`) invece di letti da
// un campo enum — il dataset non ne ha uno, quindi non serve una mappa
// di sinonimi fra province come per Veterinari. Solo 3 livelli: più che
// sufficiente per il dato disponibile oggi (nessun record ha ancora
// `h24: true`, ma il codice lo gestisce comunque).
export type LivelloUrgenzeDentista = "pronto_soccorso_24h" | "urgenze_dichiarate" | "non_dichiarata";

export const LIVELLO_URGENZE_DENTISTA: Record<
  LivelloUrgenzeDentista,
  { rango: number; evidenzia: boolean; classeBadge: string }
> = {
  pronto_soccorso_24h: {
    rango: 1,
    evidenzia: true,
    classeBadge: "bg-allerta-rossa text-white",
  },
  urgenze_dichiarate: {
    rango: 2,
    evidenzia: true,
    classeBadge: "border border-allerta-arancione-ink text-allerta-arancione-ink",
  },
  non_dichiarata: {
    rango: 3,
    evidenzia: false,
    classeBadge: "border border-line text-ink-faint",
  },
};

export function livelloUrgenzeDentista(v: VoceDentista): LivelloUrgenzeDentista {
  const gu = v.gestioneUrgenze;
  if (!gu || gu.disponibile !== true) return "non_dichiarata";
  return gu.h24 ? "pronto_soccorso_24h" : "urgenze_dichiarate";
}

// Stessa funzione di vociEmergenza() in lib/veterinari.ts: strutture non
// temporaneamente chiuse con un livello "in evidenza" (quindi esclude
// "non_dichiarata", la maggioranza — per Trieste, letteralmente tutte,
// visto che lì `gestioneUrgenze` è sempre `null`), ordinate dalla più
// pronta (pronto soccorso 24h) alla meno certa.
export function vociUrgenzeDentista(voci: VoceDentista[]): VoceDentista[] {
  return voci
    .filter((v) => !v.temporaneamenteChiuso && LIVELLO_URGENZE_DENTISTA[livelloUrgenzeDentista(v)].evidenzia)
    .sort(
      (a, b) =>
        LIVELLO_URGENZE_DENTISTA[livelloUrgenzeDentista(a)].rango -
        LIVELLO_URGENZE_DENTISTA[livelloUrgenzeDentista(b)].rango
    );
}
