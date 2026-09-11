import type { ProvinciaSlug } from "@/lib/province";
import { adessoEuropeRome, giornoSettimana, type FasciaOrariaSettimanale } from "@/lib/supermercati";
import type { StatoApertura } from "@/lib/farmacie";

import datiTrieste from "@/lib/data/veterinari-trieste.json";

export { adessoEuropeRome, giornoSettimana };
export type { FasciaOrariaSettimanale };

// Sanità → Veterinari & Emergenze (11/09/2026). Seconda sezione della
// nuova voce di menù "Sanità" (Farmacie + Cliniche & centri medici +
// Veterinari & Emergenze + Dentisti & Odontoiatri, vedi
// components/SanitaPage.tsx) — Cliniche e Dentisti restano "in arrivo"
// per ora, solo Veterinari ha dati reali in questa consegna.
//
// Stesso pattern di dato STATICO fornito dall'utente già usato per
// Commercio/Supermercati (vedi lib/supermercati.ts): nessun
// ingestX()/Supabase, un file JSON per provincia importato direttamente
// nel bundle via resolveJsonModule. Solo Trieste per ora (28 voci) —
// `PROVINCE_VETERINARI_ATTIVE` sotto elenca esplicitamente le province
// con dati reali, stesso principio di rollout parziale già usato per
// Notizie (`PROVINCE_NOTIZIE_ATTIVE` in lib/notizieProvincia.ts): un
// array esplicito invece di derivarlo da PROVINCE_LIST, per rendere
// visibile nel codice che la copertura è parziale.
//
// Differenza importante rispetto a Supermercati: qui gli orari NON sono
// un dato statico sempre completo. Molte voci (13 su 28 in questo primo
// file) hanno `orari` con OGNI giorno a `null`, non un array vuoto —
// significa "orario non pubblicato/non noto", non "chiuso quel
// giorno". Trattato quindi come terzo stato "sconosciuto" (nessun
// pallino aperta/chiusa), stesso concetto già usato per le Farmacie
// quando manca un dato per la giornata odierna — ma qui la causa è
// "il dato non è mai stato raccolto", non "l'ingestione è in ritardo"
// (non c'è ingestione, il dato è statico).
//
// Il cuore della richiesta dell'utente ("Deve essere messa in risalto
// la parte dedicata alle eventuali emergenze"): ogni voce ha un campo
// `gestione_emergenze`, un enum a 9 valori dichiarato nel JSON stesso
// (`emergency_values`) che va da "nessuna gestione dichiarata" a
// "pronto soccorso 24h". `LIVELLO_EMERGENZA` sotto assegna un rango
// (1 = massima disponibilità) e uno stile a ciascun valore;
// `EVIDENZIABILE` seleziona i livelli che rappresentano una vera
// capacità di gestire un'emergenza (esclude "non dichiarata"/"nessuna
// dichiarata", che sono la maggioranza — 17 e 2 voci su 28 — e
// "sanità pubblica veterinaria", che è un servizio istituzionale su
// appuntamento, non un pronto soccorso). VeterinariPage.tsx usa questo
// per mostrare un riquadro "Emergenze" sempre in cima alla pagina, con
// le strutture ordinate dalla più pronta (pronto soccorso 24h) alla
// meno certa (pronto intervento da confermare).

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
  latitudine: number | null;
  longitudine: number | null;
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
  emergenze_su_appuntamento: boolean | null;
  emergenze_solo_clienti: boolean | null;
  ricovero_notturno: boolean | null;
  presenza_veterinario_notturno: boolean | null;
  orari_verificati: boolean;
  emergenze_verificate: boolean;
  note: string;
};

function normalizza(r: RecordGrezzo): VoceVeterinario {
  return {
    id: r.id,
    nome: r.nome,
    tipoStruttura: r.tipo_struttura,
    indirizzo: r.indirizzo,
    cap: r.cap,
    comune: r.comune,
    provincia: ABBR_TO_SLUG[r.provincia] ?? "trieste",
    lat: r.latitudine,
    lon: r.longitudine,
    telefono: r.telefono || null,
    telefonoEmergenze: r.telefono_emergenze || null,
    email: r.email || null,
    sito: r.sito_ufficiale || null,
    orari: r.orari as OrariSettimanaVet,
    suAppuntamento: r.su_appuntamento,
    specie: r.specie,
    servizi: r.servizi,
    gestioneEmergenze: r.gestione_emergenze as GestioneEmergenza,
    orariEmergenze: r.orari_emergenze || null,
    emergenzeSuAppuntamento: r.emergenze_su_appuntamento,
    emergenzeSoloClienti: r.emergenze_solo_clienti,
    ricoveroNotturno: r.ricovero_notturno,
    presenzaVeterinarioNotturno: r.presenza_veterinario_notturno,
    orariVerificati: r.orari_verificati,
    emergenzeVerificate: r.emergenze_verificate,
    note: r.note || null,
    temporaneamenteChiuso: r.temporaneamente_chiuso,
  };
}

// Solo Trieste per ora — vedi commento esteso sopra. Le altre 3
// province restano array vuoti finché l'utente non fornirà i rispettivi
// JSON: aggiungerne una è solo un nuovo import + una riga qui sotto,
// nessuna modifica al resto del file.
export const VETERINARI_PER_PROVINCIA: Record<ProvinciaSlug, VoceVeterinario[]> = {
  trieste: (datiTrieste.records as RecordGrezzo[]).map(normalizza),
  udine: [],
  gorizia: [],
  pordenone: [],
};

export const PROVINCE_VETERINARI_ATTIVE: ProvinciaSlug[] = ["trieste"];

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
