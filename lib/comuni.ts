import type { ProvinciaSlug } from "@/lib/province";

import dati from "@/lib/data/comuni.json";

// Servizi → Comuni (14/10/2026). Prima parte della sezione "Contatti utili
// FVG" (backlog #68, sotto-punto 1): l'utente ha chiesto di sviluppare questa
// sezione, confermando — tramite domande di chiarimento — lo scopo ("Solo i
// 215 Comuni", le sedi regionali/altri enti restano fuori per una fase
// successiva), la fonte dati e la collocazione (dentro l'hub "Servizi",
// accanto a Rifiuti).
//
// Dataset STATICO raccolto da amministrazionicomunali.it (indirizzo sede,
// telefono, fax, PEC, sito web ufficiale) — vedi `nota_raccolta` nel JSON per
// il dettaglio completo della scelta della fonte e delle sue limitazioni.
// **Attenzione**: come turismofvg.it altrove nel sito, amministrazionicomunali.it
// non dichiara esplicitamente una licenza open data — l'utente è stato
// informato di questo limite ed ha scelto consapevolmente di procedere dopo
// aver verificato che le fonti ufficiali (IndicePA, open data Regione FVG)
// bloccano l'accesso automatizzato via robots.txt.
//
// Stesso pattern di dato STATICO già usato per Musei/Osmize/Siti inquinati:
// nessun ingestX()/Supabase, un unico file JSON importato direttamente nel
// bundle. A differenza di Musei/Osmize, qui non c'è raggruppamento
// comune→voci (ogni record È un comune), quindi la UI (ComuniPage.tsx) ha
// solo tab provincia + ricerca, senza tab comune.
//
// Un solo comune (San Dorligo della Valle / Dolina) non riporta indirizzo e
// telefono nella pagina sorgente (solo i recapiti dei Carabinieri locali):
// mai inventati, il campo `note` lo segnala esplicitamente e restano PEC e
// sito web ufficiale per chi cerca il contatto diretto.

export type ProvinciaSiglaComune = "UD" | "GO" | "TS" | "PN";

export type VoceComune = {
  nome: string;
  provincia: ProvinciaSlug;
  provinciaSigla: ProvinciaSiglaComune;
  indirizzo: string | null;
  telefono: string | null;
  fax: string | null;
  pec: string | null;
  sitoWeb: string | null;
  urlFonte: string;
  note: string;
};

type RecordGrezzo = {
  nome: string;
  provincia: string;
  provincia_sigla: ProvinciaSiglaComune;
  indirizzo: string | null;
  telefono: string | null;
  fax: string | null;
  pec: string | null;
  sito_web: string | null;
  url_fonte: string;
  note: string;
};

type DatasetGrezzo = {
  fonte: string;
  data_raccolta: string;
  totale_comuni_fvg: number;
  totale_raccolto: number;
  nota_raccolta: string;
  records: RecordGrezzo[];
};

const SIGLA_TO_SLUG: Record<ProvinciaSiglaComune, ProvinciaSlug> = {
  UD: "udine",
  GO: "gorizia",
  TS: "trieste",
  PN: "pordenone",
};

function normalizza(r: RecordGrezzo): VoceComune {
  return {
    nome: r.nome,
    provincia: SIGLA_TO_SLUG[r.provincia_sigla],
    provinciaSigla: r.provincia_sigla,
    indirizzo: r.indirizzo || null,
    telefono: r.telefono || null,
    fax: r.fax || null,
    pec: r.pec || null,
    sitoWeb: r.sito_web || null,
    urlFonte: r.url_fonte,
    note: r.note || "",
  };
}

const DATI = dati as DatasetGrezzo;

export const COMUNI: VoceComune[] = DATI.records.map(normalizza);

export const COMUNI_META = {
  fonte: DATI.fonte,
  dataRaccolta: DATI.data_raccolta,
  totaleComuniFvg: DATI.totale_comuni_fvg,
  totaleRaccolto: DATI.totale_raccolto,
};

export function conteggioComuniProvincia(p: ProvinciaSlug): number {
  return COMUNI.filter((c) => c.provincia === p).length;
}
