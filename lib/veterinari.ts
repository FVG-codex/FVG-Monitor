import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, giornoSettimana, type FasciaOrariaSettimanale } from "@/lib/supermercati";
import type { StatoApertura } from "@/lib/farmacie";

import datiTrieste from "@/lib/data/veterinari-trieste.json";
import datiGorizia from "@/lib/data/veterinari-gorizia.json";
import datiPordenone from "@/lib/data/veterinari-pordenone.json";
import datiUdine from "@/lib/data/veterinari-udine.json";

export { adessoEuropeRome, giornoSettimana };
export type { FasciaOrariaSettimanale };

// Sanità → Veterinari & Emergenze (11/09/2026, esteso a Gorizia il
// 13/09/2026). Seconda sezione della nuova voce di menù "Sanità"
// (Farmacie + Cliniche & centri medici + Veterinari & Emergenze +
// Dentisti & Odontoiatri, vedi components/SanitaPage.tsx) — Cliniche e
// Dentisti restano "in arrivo" per ora, solo Veterinari ha dati reali.
//
// Stesso pattern di dato STATICO fornito dall'utente già usato per
// Commercio/Supermercati (vedi lib/supermercati.ts): nessun
// ingestX()/Supabase, un file JSON per provincia importato direttamente
// nel bundle via resolveJsonModule. Trieste (28 voci) + Gorizia (16
// voci) + Pordenone (30 voci, dal 13/09/2026) + Udine (40 voci, dal
// 15/09/2026, rollout completo — tutte e 4 le province ora attive) per
// ora — `PROVINCE_VETERINARI_ATTIVE` sotto elenca
// esplicitamente le province con dati reali, stesso principio di
// rollout parziale già usato per Notizie (`PROVINCE_NOTIZIE_ATTIVE` in
// lib/notizieProvincia.ts): un array esplicito invece di derivarlo da
// PROVINCE_LIST, per rendere visibile nel codice che la copertura è
// parziale.
//
// Differenza importante rispetto a Supermercati: qui gli orari NON sono
// un dato statico sempre completo. Molte voci (13 su 28 a Trieste, 5 su
// 16 a Gorizia) hanno `orari` con OGNI giorno a `null`, non un array
// vuoto — significa "orario non pubblicato/non noto", non "chiuso quel
// giorno". Trattato quindi come terzo stato "sconosciuto" (nessun
// pallino aperta/chiusa), stesso concetto già usato per le Farmacie
// quando manca un dato per la giornata odierna — ma qui la causa è
// "il dato non è mai stato raccolto", non "l'ingestione è in ritardo"
// (non c'è ingestione, il dato è statico).
//
// Il cuore della richiesta dell'utente ("Deve essere messa in risalto
// la parte dedicata alle eventuali emergenze"): ogni voce ha un campo
// `gestione_emergenze`, un enum dichiarato nel JSON stesso
// (`emergency_values`) che va da "nessuna gestione dichiarata" a
// "pronto soccorso 24h". Il file Trieste dichiara 9 valori, il file
// Gorizia solo 6 (un vocabolario più corto) — inclusa
// "urgenze_su_chiamata_da_confermare", assente a Trieste ma equivalente
// per significato a "pronto_intervento_da_confermare": mappata su
// quello stesso valore da `normalizzaGestioneEmergenza()` sotto, invece
// di aggiungere un decimo valore canonico per un sinonimo. `LIVELLO_EMERGENZA`
// sotto assegna un rango (1 = massima disponibilità) e uno stile a
// ciascun valore canonico; il campo `evidenzia` seleziona i livelli che
// rappresentano una vera capacità di gestire un'emergenza (esclude "non
// dichiarata"/"nessuna dichiarata", la maggioranza in entrambi i file,
// e "sanità pubblica veterinaria", un servizio istituzionale su
// appuntamento, non un pronto soccorso). VeterinariPage.tsx usa questo
// per mostrare un riquadro "Emergenze" sempre in cima alla pagina, con
// le strutture ordinate dalla più pronta (pronto soccorso 24h) alla
// meno certa (pronto intervento da confermare).
//
// Fragilità di schema scoperte con il file Gorizia (non presenti nel
// file Trieste, corrette in `normalizza()` con `?? null` invece di un
// passthrough diretto): 2 voci (GO-VET-005, GO-VET-011) omettono del
// tutto le chiavi `latitudine`/`longitudine` invece di valorizzarle a
// `null` — senza la coercizione, `VeterinariMap.tsx` (che filtra su
// `v.lat !== null && v.lon !== null`) le avrebbe trattate come "con
// coordinate" e passato `undefined` a Leaflet, mandando la mappa in
// crash (stessa classe di bug già vista con `orari` nulli su
// Supermercati Udine, l'11/09/2026). 2 voci (GO-VET-002, GO-VET-016)
// omettono allo stesso modo `emergenze_su_appuntamento`/
// `emergenze_solo_clienti` — questi due campi non sono ancora letti da
// nessun componente UI, quindi non causavano un crash, ma la
// coercizione è stata applicata comunque per coerenza e robustezza
// futura.
//
// Correzione dato Gorizia, stesso giorno (13/09/2026, "database
// aggiornato"): ancora 16 voci ma non le stesse — GO-VET-010 (Dott.ssa
// Barbara Borsetta) rimossa perché risulta oggi operativa fuori
// provincia (Mortegliano, UD), motivo esplicito in un nuovo blocco
// `audit.record_esclusi` (novità di formato, stesso pattern già visto
// sui file Supermercati); GO-VET-017 (Dott.ssa Alberta Bigot, Cormons)
// aggiunta. GO-VET-009 ha cambiato identità (da "Studio Veterinario Del
// Medico, Borgia e Nano" a "Ambulatorio Veterinario Isontino", stesso
// indirizzo, fonte ora la pagina ufficiale del gruppo Gruppo Animalia)
// e alcune voci (GO-VET-006/008/014) hanno ricevuto orari/contatti
// meglio verificati. Nessuna nuova fragilità di schema: gli stessi 2
// casi di lat/lon assenti (GO-VET-005, GO-VET-011) e gli stessi campi
// emergenze_* opzionali restano — già gestiti dal codice sopra, nessuna
// modifica necessaria a `normalizza()`/`normalizzaGestioneEmergenza()`.
//
// Estensione a Pordenone (13/09/2026, stesso giorno): terza provincia,
// inizialmente 33 voci, richiesta esplicitamente come rollout parziale
// ("aggiungi i veterinari di Pordenone, risolveremo i vari conflitti più
// avanti"). Il file Pordenone non dichiara affatto `emergency_values` (a
// differenza di Trieste e Gorizia, che dichiarano un proprio
// vocabolario) e introduce 4 valori di `gestione_emergenze` mai visti
// prima: "urgenze_su_chiamata" e "reperibilita_fuori_orario" (3 voci
// ciascuno, tutte con un `orari_emergenze` che descrive una vera
// modalità di reperibilità telefonica dedicata) mappati su
// "reperibilita_telefonica"; "reperibilita_da_confermare" e
// "pronto_soccorso_h24_da_confermare" (1 voce ciascuno — quest'ultimo,
// PN-VET-025, nonostante il nome suggerisca un pronto soccorso H24, ha
// `emergenze_verificate: false` e nessun `orari_emergenze` valorizzato,
// quindi non fa una vera affermazione più forte del generico "da
// confermare") mappati su "pronto_intervento_da_confermare" — stesso
// principio già usato per Gorizia: sinonimo su un valore canonico
// esistente invece di un decimo valore enum, coerente con la tolleranza
// esplicita dell'utente per un vocabolario non ancora riconciliato del
// tutto. Il campo `apertura_24h` (nuovo, presente solo per
// coerenza/ridondanza: true unicamente per PN-VET-001, che ha già
// `gestione_emergenze: pronto_soccorso_24h`) non viene letto da
// `normalizza()`: è un duplicato del dato già rappresentato dall'enum,
// non introduce informazione nuova. Altri campi nuovi visti solo qui
// (`fonte_orari_controllo`, `livello_verifica_orari`, `stato_verifica`,
// `esistenza_verificata`, `data_verifica`, `fonte_principale`,
// `fonte_emergenze`, `fonte_orari`) sono metadati di provenienza non
// letti da alcun componente UI, ignorati come già fatto per campi
// analoghi su Gorizia. 2 voci (PN-VET-014, PN-VET-027) omettono
// lat/lon — già gestito dalla coercizione `?? null` esistente, nessuna
// modifica necessaria. 2 voci escluse in `audit.record_esclusi`: ASFO -
// Ambulatorio territoriale di Spilimbergo (chiuso dal 01/01/2026,
// prestazioni trasferite ad Aviano/Azzano Decimo/San Quirino) e
// Veterinary Treatment Facility - Base USAF Aviano (struttura militare,
// accesso riservato, non un servizio pubblico).
//
// Correzione dato Pordenone, stesso giorno (13/09/2026, "provincia di
// Pordenone completa e verificata"): da 33 a 30 voci. 3 rimosse, tutte
// motivate in `audit.record_esclusi` (nessuna aggiunta, nessun nuovo
// id): Ambulatorio Veterinario Scomparcini Dott. Paolo (chiuso per
// pensionamento, dichiarato da più directory), Ambulatorio Veterinario
// Califano Caterina (attività non confermata: una fonte la segnala
// chiusa, altre pubblicano orari fra loro incompatibili, l'iscrizione
// FNOVI della professionista non basta a confermare l'operatività della
// sede) e Ambulatorio Veterinario Locatello Dott. Claudio (stesso
// problema: fonti in conflitto sugli orari, nessuna fonte ufficiale
// risolutiva). 2 voci rimaste (PN-VET-010 Puiatti, PN-VET-022 Ros)
// hanno ricevuto solo una fonte di controllo migliore per gli orari
// (`fonte_orari`/`fonte_orari_controllo`/`note`/`stato_verifica`
// aggiornati da "conflittuale" a "concordante fra due fonti
// secondarie") — nessun dato letto dalla UI è cambiato in modo
// sostanziale. Nessuna nuova fragilità di schema: stesso key-union,
// stesso set di valori `gestione_emergenze` (tutti già coperti da
// `MAPPA_GESTIONE_EMERGENZA`), stesse 2 voci senza lat/lon — nessuna
// modifica a `normalizza()`/`normalizzaGestioneEmergenza()` necessaria,
// solo la sostituzione del file JSON.
//
// Estensione a Udine (15/09/2026, "database completo"): quarta e
// ultima provincia, 40 voci — con questa tutte e 4 le province FVG
// hanno dati reali su Veterinari & Emergenze. Stesso pattern di
// estensione. 3 valori `gestione_emergenze` mai visti prima, tutti
// sinonimi verificati mappati su valori canonici esistenti (vedi
// `MAPPA_GESTIONE_EMERGENZA` sopra): "urgenze_durante_apertura" →
// "urgenze_in_orario" (stesso concetto di Trieste, solo nome diverso);
// "emergenze_07_23" e "reperibilita_emergenze_h24" → "reperibilita_telefonica"
// (entrambe reperibilità telefoniche vere e confermate, non un pronto
// soccorso fisico — il dettaglio delle ore effettive, incluso il caso
// H24, resta comunque visibile nel testo libero `orariEmergenze`
// mostrato in pagina, quindi nessuna informazione va persa nel
// raggruppamento sotto lo stesso valore canonico).
//
// Novità importante nel significato di `audit.record_esclusi` rispetto
// alle altre province: qui non sempre indica una struttura rimossa per
// intero. Su 5 voci in audit, 3 sono esclusioni totali (Studio
// Veterinario Silvana Lazzarin, 4 Talpes - Gemona e Tolmezzo — un
// pet-shop/toelettatura, non una struttura sanitaria — e Ca' Zampa
// Udine, chiusa definitivamente), verificate assenti da `records`
// controllando l'intero file, non solo l'elenco audit. Le altre 2 voci
// audit invece SONO presenti in `records` con la loro scheda completa
// (indirizzo/orari/telefono): "Rita Duratti" corrisponde a UD-VET-019 e
// "Peresson, Isler, Roppa, Crosere e Londero" corrisponde a 5 schede
// distinte (UD-VET-017/027/030/103/104) — in questi 2 casi l'audit
// documenta solo perché la loro dichiarazione di reperibilità/urgenza/
// pronto soccorso non è stata considerata attendibile (fonti secondarie
// discordanti, nessuna conferma ufficiale), non che la struttura sia
// stata rimossa: infatti tutte e 6 queste schede hanno
// `gestione_emergenze: "non_dichiarata"` nel file, coerente con
// l'esclusione della sola dichiarazione di emergenza. Nessuna modifica
// di codice necessaria per questo (il campo `gestione_emergenze` del
// JSON è già la fonte di verità), ma vale la pena annotarlo per chi
// legge `audit.record_esclusi` di un file futuro aspettandosi sempre
// un'esclusione totale come nelle province precedenti. 3 voci
// (UD-VET-032/033/034, i servizi ASUFC di sanità animale) hanno `orari`
// con ogni giorno a `null` — già gestito dal codice esistente. Nessuna
// voce priva di lat/lon in questo file.

export type GestioneEmergenza =
  | "non_dichiarata"
  | "nessuna_dichiarata"
  | "urgenze_in_orario"
  | "reperibilita_telefonica"
  | "guardia_medica_veterinaria"
  | "pronto_soccorso_diurno"
  | "pronto_soccorso_24h"
  | "pronto_intervento_da_confermare"
  | "sanita_pubblica_veterinaria";

export type OrariGiornoVet = FasciaOrariaSettimanale[] | null;

export type OrariSettimanaVet = {
  lunedi: OrariGiornoVet;
  martedi: OrariGiornoVet;
  mercoledi: OrariGiornoVet;
  giovedi: OrariGiornoVet;
  venerdi: OrariGiornoVet;
  sabato: OrariGiornoVet;
  domenica: OrariGiornoVet;
};

export type VoceVeterinario = {
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
  telefonoEmergenze: string | null;
  email: string | null;
  sito: string | null;
  orari: OrariSettimanaVet;
  suAppuntamento: boolean | null;
  specie: string;
  servizi: string;
  gestioneEmergenze: GestioneEmergenza;
  orariEmergenze: string | null;
  emergenzeSuAppuntamento: boolean | null;
  emergenzeSoloClienti: boolean | null;
  ricoveroNotturno: boolean | null;
  presenzaVeterinarioNotturno: boolean | null;
  orariVerificati: boolean;
  emergenzeVerificate: boolean;
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
  // Opzionali (non solo `| null`): il file Gorizia (13/09/2026) omette
  // del tutto queste chiavi in alcune voci invece di valorizzarle a
  // `null` (es. GO-VET-005/011 senza lat/lon, GO-VET-002/016 senza
  // emergenze_su_appuntamento/emergenze_solo_clienti) — `normalizza()`
  // sotto usa `?? null` proprio per questo, ma il tipo deve riflettere
  // che la chiave può mancare, non solo essere `null`.
  latitudine?: number | null;
  longitudine?: number | null;
  telefono: string;
  telefono_emergenze: string;
  email: string;
  sito_ufficiale: string;
  orari: Record<string, { apre: string; chiude: string }[] | null>;
  su_appuntamento: boolean | null;
  specie: string;
  servizi: string;
  gestione_emergenze: string;
  orari_emergenze: string;
  emergenze_su_appuntamento?: boolean | null;
  emergenze_solo_clienti?: boolean | null;
  ricovero_notturno: boolean | null;
  presenza_veterinario_notturno: boolean | null;
  orari_verificati: boolean;
  emergenze_verificate: boolean;
  note: string;
};

// Mappa i valori grezzi di `gestione_emergenze` letti dal JSON al set
// canonico `GestioneEmergenza` usato dal codice. Necessaria perché non
// tutti i file provincia usano lo stesso vocabolario: il file Trieste
// (11/09/2026) ha introdotto 9 valori, ma il file Gorizia (13/09/2026)
// dichiara un proprio `emergency_values` con solo 6 voci, che include
// "urgenze_su_chiamata_da_confermare" — assente dal set di Trieste ma
// equivalente per significato a "pronto_intervento_da_confermare"
// (stesso caso d'uso: urgenza gestita solo su chiamata, da confermare
// telefonicamente). Un valore non mappato ricade su "non_dichiarata"
// invece di propagare una stringa arbitraria in un campo tipizzato —
// LIVELLO_EMERGENZA[...] altrimenti risulterebbe `undefined` e
// andrebbe in crash alla prima lettura di `.rango`/`.evidenzia` (stessa
// classe di bug già vista con `orari` nulli su Supermercati Udine).
const MAPPA_GESTIONE_EMERGENZA: Record<string, GestioneEmergenza> = {
  non_dichiarata: "non_dichiarata",
  nessuna_dichiarata: "nessuna_dichiarata",
  urgenze_in_orario: "urgenze_in_orario",
  reperibilita_telefonica: "reperibilita_telefonica",
  guardia_medica_veterinaria: "guardia_medica_veterinaria",
  pronto_soccorso_diurno: "pronto_soccorso_diurno",
  pronto_soccorso_24h: "pronto_soccorso_24h",
  pronto_intervento_da_confermare: "pronto_intervento_da_confermare",
  urgenze_su_chiamata_da_confermare: "pronto_intervento_da_confermare", // sinonimo, file Gorizia
  sanita_pubblica_veterinaria: "sanita_pubblica_veterinaria",
  // Sinonimi introdotti dal file Pordenone (13/09/2026, vocabolario
  // proprio, `emergency_values` assente dal file) — vedi commento esteso
  // sopra per il dettaglio dei singoli record controllati prima di
  // scegliere la mappatura.
  reperibilita_fuori_orario: "reperibilita_telefonica",
  urgenze_su_chiamata: "reperibilita_telefonica",
  reperibilita_da_confermare: "pronto_intervento_da_confermare",
  pronto_soccorso_h24_da_confermare: "pronto_intervento_da_confermare",
  // Sinonimi introdotti dal file Udine (15/09/2026, vocabolario proprio
  // di nuovo, "emergency_values" assente). "urgenze_durante_apertura"
  // è lo stesso concetto già canonico "urgenze_in_orario" (Trieste),
  // solo un nome diverso. "emergenze_07_23"/"reperibilita_emergenze_h24"
  // sono entrambe reperibilità telefoniche vere e verificate (non
  // pronto soccorso fisico, il testo libero `orari_emergenze` porta il
  // dettaglio delle ore effettive, incluso il caso H24) — mappate sullo
  // stesso valore canonico "reperibilita_telefonica" già usato per
  // Trieste/Gorizia/Pordenone invece di introdurre un ennesimo valore
  // per una differenza di grado, non di natura del servizio.
  urgenze_durante_apertura: "urgenze_in_orario",
  emergenze_07_23: "reperibilita_telefonica",
  reperibilita_emergenze_h24: "reperibilita_telefonica",
};

function normalizzaGestioneEmergenza(raw: string): GestioneEmergenza {
  return MAPPA_GESTIONE_EMERGENZA[raw] ?? "non_dichiarata";
}

function normalizza(r: RecordGrezzo): VoceVeterinario {
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
    telefonoEmergenze: r.telefono_emergenze || null,
    email: r.email || null,
    sito: r.sito_ufficiale || null,
    orari: r.orari as OrariSettimanaVet,
    suAppuntamento: r.su_appuntamento,
    specie: r.specie,
    servizi: r.servizi,
    gestioneEmergenze: normalizzaGestioneEmergenza(r.gestione_emergenze),
    orariEmergenze: r.orari_emergenze || null,
    emergenzeSuAppuntamento: r.emergenze_su_appuntamento ?? null,
    emergenzeSoloClienti: r.emergenze_solo_clienti ?? null,
    ricoveroNotturno: r.ricovero_notturno,
    presenzaVeterinarioNotturno: r.presenza_veterinario_notturno,
    orariVerificati: r.orari_verificati,
    emergenzeVerificate: r.emergenze_verificate,
    note: r.note || null,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
  };
}

// Trieste + Gorizia per ora — vedi commento esteso sopra. Le altre 2
// province restano array vuoti finché l'utente non fornirà i rispettivi
// JSON: aggiungerne una è solo un nuovo import + una riga qui sotto,
// nessuna modifica al resto del file.
export const VETERINARI_PER_PROVINCIA: Record<ProvinciaSlug, VoceVeterinario[]> = {
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: (datiUdine.records as RecordGrezzo[]).map(normalizza),
  gorizia: (datiGorizia.records as RecordGrezzo[]).map(normalizza),
  pordenone: (datiPordenone.records as RecordGrezzo[]).map(normalizza),
};

export const PROVINCE_VETERINARI_ATTIVE: ProvinciaSlug[] = ["trieste", "gorizia", "pordenone", "udine"];

// Rango (1 = massima disponibilità/prontezza) + etichetta + stile per
// ciascun valore di gestione_emergenze. "sanita_pubblica_veterinaria" è
// un servizio istituzionale su appuntamento (non un pronto soccorso, va
// mostrato ma non messo in evidenza come emergenza); "non_dichiarata" e
// "nessuna_dichiarata" restano fuori dal riquadro Emergenze per
// definizione (nessuna capacità dichiarata).
export const LIVELLO_EMERGENZA: Record<
  GestioneEmergenza,
  { rango: number; etichetta: string; evidenzia: boolean; classeBadge: string }
> = {
  pronto_soccorso_24h: {
    rango: 1,
    etichetta: "Pronto soccorso 24h",
    evidenzia: true,
    classeBadge: "bg-allerta-rossa text-white",
  },
  pronto_soccorso_diurno: {
    rango: 2,
    etichetta: "Pronto soccorso diurno",
    evidenzia: true,
    classeBadge: "bg-allerta-arancione text-[#241B04]",
  },
  guardia_medica_veterinaria: {
    rango: 3,
    etichetta: "Guardia medica veterinaria",
    evidenzia: true,
    classeBadge: "bg-allerta-arancione text-[#241B04]",
  },
  reperibilita_telefonica: {
    rango: 4,
    etichetta: "Reperibilità telefonica",
    evidenzia: true,
    classeBadge: "border border-allerta-arancione-ink text-allerta-arancione-ink",
  },
  urgenze_in_orario: {
    rango: 5,
    etichetta: "Urgenze in orario di apertura",
    evidenzia: true,
    classeBadge: "border border-cool-ink text-cool-ink",
  },
  pronto_intervento_da_confermare: {
    rango: 6,
    etichetta: "Pronto intervento (da confermare)",
    evidenzia: true,
    classeBadge: "border border-allerta-gialla text-ink-dim",
  },
  sanita_pubblica_veterinaria: {
    rango: 7,
    etichetta: "Sanità pubblica veterinaria (su appuntamento)",
    evidenzia: false,
    classeBadge: "border border-line text-ink-faint",
  },
  nessuna_dichiarata: {
    rango: 8,
    etichetta: "Nessuna gestione emergenze dichiarata",
    evidenzia: false,
    classeBadge: "border border-line text-ink-faint",
  },
  non_dichiarata: {
    rango: 9,
    etichetta: "Gestione emergenze non dichiarata",
    evidenzia: false,
    classeBadge: "border border-line text-ink-faint",
  },
};

export function vociEmergenza(voci: VoceVeterinario[]): VoceVeterinario[] {
  return voci
    .filter((v) => !v.temporaneamenteChiuso && LIVELLO_EMERGENZA[v.gestioneEmergenze].evidenzia)
    .sort((a, b) => LIVELLO_EMERGENZA[a.gestioneEmergenze].rango - LIVELLO_EMERGENZA[b.gestioneEmergenze].rango);
}

export function formattaFasceGiornoVet(fasce: OrariGiornoVet): string {
  if (fasce === null) return "Orario non pubblicato";
  if (fasce.length === 0) return "Chiuso";
  return fasce.map((f) => `${f.apre}–${f.chiude}`).join(", ");
}

// "Aperta ora"/"Chiusa ora"/"sconosciuto" — a differenza di
// statoAperturaSupermercato() (dato sempre completo, array vuoto =
// chiuso), qui un giorno a `null` significa che l'orario non è mai
// stato raccolto per quella struttura: nessun pallino, non un "chiusa"
// inventato. Stesso terzo stato "sconosciuto" già usato per le Farmacie.
export function statoAperturaVeterinario(v: VoceVeterinario, adesso: string): StatoApertura {
  if (v.temporaneamenteChiuso) return "chiusa";

  const giorno = giornoSettimana(adesso);
  const fasceOggi = v.orari[giorno];
  if (fasceOggi === null) return "sconosciuto";
  if (fasceOggi.length === 0) return "chiusa";

  const oraAdesso = adesso.slice(11, 16);
  const aperta = fasceOggi.some((f) => oraAdesso >= f.apre && oraAdesso < f.chiude);
  return aperta ? "aperta" : "chiusa";
}

export const NOMI_GIORNO: Record<keyof OrariSettimanaVet, string> = {
  lunedi: "Lun",
  martedi: "Mar",
  mercoledi: "Mer",
  giovedi: "Gio",
  venerdi: "Ven",
  sabato: "Sab",
  domenica: "Dom",
};
