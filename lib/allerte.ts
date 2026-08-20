import { fetchJsonp } from "@/lib/jsonp";
import type { ProvinciaSlug } from "@/lib/province";

export const ISTATCODE_PROVINCIA: Record<ProvinciaSlug, number> = {
  trieste: 32006,
  udine: 30129,
  gorizia: 31007,
  pordenone: 93033,
};

const LIVELLO_NOME = ["verde", "gialla", "arancione", "rossa"] as const;
export type LivelloAllerta = (typeof LIVELLO_NOME)[number];

export type AllertaSingola = {
  titolo: string;
  messaggio: string;
  livello: number;
  livelloNome: LivelloAllerta;
  link: string;
};

type RispostaApi = {
  alerts?: {
    title: string;
    description: string;
    level: number;
    zone?: string;
    link_url: string;
  }[];
};

export type EsitoProvincia = { zona: "A" | "B" | "C" | "D" | null; allerte: AllertaSingola[] };

export async function fetchAllertaProvincia(istat: number): Promise<EsitoProvincia> {
  const dati = (await fetchJsonp(
    `https://pianiemergenza.protezionecivile.fvg.it/api/alerts.jsonp?istat=${istat}&tk=001`,
    { nomeCallback: "pcrfvgit_widget_setup" }
  )) as RispostaApi;

  const allerte: AllertaSingola[] = (dati.alerts || []).map((a) => ({
    titolo: a.title,
    messaggio: a.description,
    livello: a.level,
    livelloNome: LIVELLO_NOME[a.level] ?? "gialla",
    link: a.link_url,
  }));

  const zonaGrezza = dati.alerts?.[0]?.zone;
  const zona = (zonaGrezza ? zonaGrezza.replace("FVG-", "") : null) as "A" | "B" | "C" | "D" | null;

  return { zona, allerte };
}

// Recupera le allerte per tutte e 4 le province — usato dalla
// homepage (banner regionale + pannello zone). Le chiamate sono
// SEQUENZIALI (non in parallelo): condividono lo stesso nome di
// callback fisso ("pcrfvgit_widget_setup", quello che il server si
// aspetta), quindi farle in parallelo causerebbe collisioni tra loro.
// Ogni chiamata fallita viene ignorata singolarmente.
export async function fetchTutteLeAllerte(): Promise<Partial<Record<ProvinciaSlug, EsitoProvincia>>> {
  const risultato: Partial<Record<ProvinciaSlug, EsitoProvincia>> = {};
  for (const [provincia, istat] of Object.entries(ISTATCODE_PROVINCIA) as [ProvinciaSlug, number][]) {
    try {
      risultato[provincia] = await fetchAllertaProvincia(istat);
    } catch {
      // provincia singola non disponibile — le altre proseguono comunque
    }
  }
  return risultato;
}
