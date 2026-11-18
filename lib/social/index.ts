// Modulo "Social" (18/11/2026) — registro dei tipi di post programmati.
// Per aggiungere un nuovo tipo: creare lib/social/<nome>.tsx che
// implementa GeneratoreSocial, registrarlo qui e aggiungerlo a
// PROGRAMMA in scripts/social-publish.mjs (orario + piattaforme).

import { meteoMattino } from "./meteoMattino";
import type { GeneratoreSocial } from "./tipi";

export const GENERATORI: Record<string, GeneratoreSocial<any>> = {
  [meteoMattino.tipo]: meteoMattino,
};

export function urlSitoPubblico(origineRichiesta: string): string {
  return (process.env.SOCIAL_SITE_URL || origineRichiesta).replace(/\/$/, "");
}
