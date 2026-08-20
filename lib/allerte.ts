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
    `https://pianiemergenza.protezionecivile.fvg.it/api/alerts.jsonp?istat=${istat}&tk=001`
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

// Recupera le allerte per tutte e 4 le province in parallelo — usato
// dalla homepage (banner regionale + pannello zone). Ogni chiamata
// fallita viene ignorata singolarmente (non blocca le altre).
export async function fetchTutteLeAllerte(): Promise<Partial<Record<ProvinciaSlug, EsitoProvincia>>> {
  const risultato: Partial<Record<ProvinciaSlug, EsitoProvincia>> = {};
  await Promise.all(
    (Object.entries(ISTATCODE_PROVINCIA) as [ProvinciaSlug, number][]).map(async ([provincia, istat]) => {
      try {
        risultato[provincia] = await fetchAllertaProvincia(istat);
      } catch {
        // provincia singola non disponibile — le altre proseguono comunque
      }
    })
  );
  return risultato;
}
