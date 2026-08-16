export type ProvinciaSlug = "trieste" | "udine" | "gorizia" | "pordenone";

export const PROVINCE: Record<
  ProvinciaSlug,
  { nome: string; zona: "A" | "B" | "C" | "D"; slug: ProvinciaSlug }
> = {
  trieste: { nome: "Trieste", zona: "C", slug: "trieste" },
  udine: { nome: "Udine", zona: "B", slug: "udine" },
  gorizia: { nome: "Gorizia", zona: "C", slug: "gorizia" },
  pordenone: { nome: "Pordenone", zona: "A", slug: "pordenone" },
};

export const PROVINCE_LIST = Object.values(PROVINCE);
