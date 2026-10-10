import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, type StatoApertura } from "@/lib/farmacie";
import { giornoSettimana, type GiornoSettimana } from "@/lib/orario";
import type { FasciaOrariaSettimanale } from "@/lib/supermercati";

import datiTrieste from "@/lib/data/cliniche-trieste.json";

export { adessoEuropeRome, giornoSettimana };
export type { FasciaOrariaSettimanale };

// Sanità → Cliniche & centri medici (10/10/2026). Stesso pattern di dato
// STATICO fornito dall'utente già usato per Dentisti (lib/dentisti.ts) e
// Veterinari (lib/veterinari.ts): nessun ingestX()/Supabase, un file
// JSON per provincia importato direttamente nel bundle via
// resolveJsonModule. `giornoSettimana` importata da "@/lib/orario" (non
// da "@/lib/supermercati") per lo stesso motivo di performance già
// documentato in lib/dentisti.ts/lib/veterinari.ts: importarla da
// lib/supermercati.ts trascinerebbe nel bundle client di /cliniche
// anche l'intero dataset Supermercati, mai usato da questa pagina.
//
// Differenza deliberata rispetto a Dentisti/Veterinari, su richiesta
// esplicita dell'utente (10/10/2026, "qui non utilizzeremo criteri per
// le emergenze"): QUESTO FILE NON HA alcun campo/tipo di gestione
// urgenze — nessun `GestioneUrgenzeClinica`, nessun riquadro Emergenze
// nella pagina, nessuna colorazione speciale dei marker sulla mappa.
// Due campi nuovi rispetto a Dentisti/Veterinari, invece:
// 1. `specialita` (array di stringhe) — una clinica/centro medico è
//    tipicamente polispecialistica (es. "Cardiologia", "Fisioterapia",
//    "Diagnostica per immagini" nello stesso record), a differenza di
//    Dentisti/Veterinari che sono per definizione monospecialistici.
// 2. `convenzionata_ssr`/`convenzionataSsr` — generico ("Servizio
//    Sanitario Regionale") invece di legato a una singola azienda
//    sanitaria come `convenzionato_asugi` in Dentisti. Lì quel nome è
//    diventato limitante non appena il rollout ha toccato zone servite
//    da ASUFC (Udine) e ASFO (Pordenone) invece di ASUGI (Trieste/
//    Gorizia) — tre nomi diversi scoperti uno alla volta. Qui si parte
//    generico da subito per lo stesso identico motivo.
//
// Trieste — prima provincia attivata (10/10/2026),
// `cliniche-centri-medici-provincia-trieste.json` (17 record). File di
// buona qualità: nessun ID duplicato, `audit.record_esclusi` con
// motivazione dettagliata per ciascuna delle 3 esclusioni (attività
// trasferita, indirizzo storico sostituito, RSA fuori perimetro di
// questa sezione), coordinate presenti su tutti e 17 i record. **Una
// sola divergenza di schema trovata e gestita in `normalizzaGiorno()`
// sotto**: il valore di `orari` per il giorno "sabato" (5 record) e
// "domenica" (1 record) arriva talvolta come un singolo OGGETTO
// `{ apre, chiude }` invece di un ARRAY di oggetti come ogni altro
// giorno/record di questo file e come richiesto dal template — es.
// `"sabato": { "apre": "07:45", "chiude": "19:30" }` invece di
// `"sabato": [{ "apre": "07:45", "chiude": "19:30" }]`. Un oggetto
// singolo viene incapsulato in un array di un elemento invece di
// rifiutare il file o far crashare `formattaFasceGiornoClinica()`.
export type OrarioGiornoClinica = FasciaOrariaSettimanale[] | null;

export type OrariSettimanaClinica = Record<GiornoSettimana, OrarioGiornoClinica>;

export type VoceClinica = {
  id: string;
  nome: string;
  tipoStruttura: string;
  specialita: string[];
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: ProvinciaSlug;
  lat: number | null;
  lon: number | null;
  telefono: string | null;
  email: string | null;
  sito: string | null;
  orari: OrariSettimanaClinica;
  suAppuntamento: boolean | null;
  convenzionataSsr: boolean | null;
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
  // Opzionale per cautela (stesso trattamento di lib/dentisti.ts), ma il
  // file di Trieste lo compila sempre.
  specialita?: string[];
  indirizzo: string;
  cap: string;
  comune: string;
  latitudine?: number | null;
  longitudine?: number | null;
  // Sempre array di stringhe nel file di Trieste (mai scalare semplice),
  // ma `string | string[] | null` per cautela — stessa funzione di
  // normalizzazione già usata in Dentisti/Veterinari.
  telefono?: string | string[] | null;
  email?: string | string[] | null;
  sito_ufficiale?: string | null;
  // Il valore di ciascun giorno può essere un array di fasce, un singolo
  // oggetto fascia (anomalia del file di Trieste, vedi commento esteso
  // sopra) o `null` — gestito da `normalizzaGiorno()` sotto.
  orari: Record<string, FasciaOrariaSettimanale[] | FasciaOrariaSettimanale | null> | null;
  su_appuntamento?: boolean | null;
  convenzionata_ssr?: boolean | null;
  orari_verificati: boolean;
  note?: string | null;
};

const ORARI_SCONOSCIUTI: OrariSettimanaClinica = {
  lunedi: null,
  martedi: null,
  mercoledi: null,
  giovedi: null,
  venerdi: null,
  sabato: null,
  domenica: null,
};

const GIORNI: GiornoSettimana[] = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];

// `telefono`/`email` possono arrivare come stringa semplice, array di
// stringhe o `null` — stessa funzione già usata in lib/dentisti.ts. Un
// array viene unito con "; ".
function normalizzaTelefonoEmail(valore: string | string[] | null | undefined): string | null {
  if (!valore) return null;
  if (Array.isArray(valore)) {
    const filtrati = valore.map((v) => v.trim()).filter(Boolean);
    return filtrati.length > 0 ? filtrati.join("; ") : null;
  }
  return valore || null;
}

// Un giorno può arrivare come array di fasce, un singolo oggetto fascia
// (anomalia del file di Trieste — "sabato"/"domenica" su 6 record, vedi
// commento esteso in testa al file) o `null`. Un oggetto singolo viene
// incapsulato in un array di un elemento, così il resto del codice (qui
// e nei componenti) può sempre assumere "array o null", mai un oggetto
// nudo.
function normalizzaGiorno(
  valore: FasciaOrariaSettimanale[] | FasciaOrariaSettimanale | null | undefined
): OrarioGiornoClinica {
  if (valore === null || valore === undefined) return null;
  if (Array.isArray(valore)) return valore;
  return [valore];
}

function normalizzaOrari(orari: RecordGrezzo["orari"]): OrariSettimanaClinica {
  if (!orari) return ORARI_SCONOSCIUTI;
  const risultato = {} as OrariSettimanaClinica;
  for (const giorno of GIORNI) {
    risultato[giorno] = normalizzaGiorno(orari[giorno]);
  }
  return risultato;
}

function normalizza(r: RecordGrezzo): VoceClinica {
  return {
    id: r.id,
    nome: r.nome,
    tipoStruttura: r.tipo_struttura,
    specialita: r.specialita ?? [],
    indirizzo: r.indirizzo,
    cap: r.cap,
    comune: r.comune,
    provincia: ABBR_TO_SLUG[r.provincia] ?? "trieste",
    lat: r.latitudine ?? null,
    lon: r.longitudine ?? null,
    telefono: normalizzaTelefonoEmail(r.telefono),
    email: normalizzaTelefonoEmail(r.email),
    sito: r.sito_ufficiale || null,
    orari: normalizzaOrari(r.orari),
    suAppuntamento: r.su_appuntamento ?? null,
    convenzionataSsr: r.convenzionata_ssr ?? null,
    orariVerificati: r.orari_verificati,
    note: r.note || null,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
  };
}

// Solo Trieste attiva per ora (rollout graduale già fatto per Dentisti/
// Veterinari/Supermercati) — le altre 3 restano array vuoto finché
// l'utente non fornirà i rispettivi dati.
export const CLINICHE_PER_PROVINCIA: Record<ProvinciaSlug, VoceClinica[]> = {
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: [],
  gorizia: [],
  pordenone: [],
};

export const PROVINCE_CLINICHE_ATTIVE: ProvinciaSlug[] = ["trieste"];

// Stessa identica logica di statoAperturaDentista() in lib/dentisti.ts
// e statoAperturaVeterinario() in lib/veterinari.ts (orari settimanali
// ricorrenti, un giorno `null` significa "mai raccolto", non "chiuso").
export function statoAperturaClinica(v: VoceClinica, adesso: string): StatoApertura {
  if (v.temporaneamenteChiuso) return "chiusa";

  const giorno = giornoSettimana(adesso);
  const fasceOggi = v.orari[giorno];
  if (fasceOggi === null) return "sconosciuto";
  if (fasceOggi.length === 0) return "chiusa";

  const oraAdesso = adesso.slice(11, 16);
  const aperta = fasceOggi.some((f) => oraAdesso >= f.apre && oraAdesso < f.chiude);
  return aperta ? "aperta" : "chiusa";
}

// Stessa funzione di formattaFasceGiornoDentista() in lib/dentisti.ts —
// le 2 etichette per i casi senza fasce orarie sono passate già
// tradotte dal chiamante (namespace "cliniche").
export function formattaFasceGiornoClinica(
  fasce: OrarioGiornoClinica,
  testoOrarioNonPubblicato: string,
  testoChiuso: string
): string {
  if (fasce === null) return testoOrarioNonPubblicato;
  if (fasce.length === 0) return testoChiuso;
  return fasce.map((f) => `${f.apre}–${f.chiude}`).join(", ");
}
