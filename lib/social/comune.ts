// Modulo "Social" (18/11/2026) — funzioni e costanti comuni ai
// generatori di contenuto (vedi lib/social/tipi.ts).

import { createClient } from "@supabase/supabase-js";

/** Colori ripresi da app/globals.css (variante scura) — come opengraph-image.tsx. */
export const COLORI = {
  bg: "rgb(14, 37, 41)",
  panel: "rgb(21, 51, 56)",
  panelAlt: "rgb(28, 63, 71)",
  line: "rgb(39, 75, 80)",
  ink: "rgb(237, 232, 221)",
  inkDim: "rgb(157, 179, 174)",
  inkFaint: "rgb(146, 170, 168)",
  warm: "rgb(205, 117, 84)",
  cool: "rgb(95, 179, 163)",
  arancione: "rgb(232, 150, 79)",
} as const;

export const FUSO = "Europe/Rome";

/** Giorno locale italiano in formato YYYY-MM-DD. */
export function giornoLocale(d: Date = new Date()): string {
  // "sv-SE" formatta le date come YYYY-MM-DD
  return new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(d);
}

/** "Mercoledì 18 novembre" a partire da YYYY-MM-DD. */
export function dataEstesa(giorno: string): string {
  const [a, m, g] = giorno.split("-").map(Number);
  // mezzogiorno UTC: nessun rischio di "scivolare" al giorno prima/dopo
  const d = new Date(Date.UTC(a, m - 1, g, 12));
  const s = new Intl.DateTimeFormat("it-IT", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tronca a fine frase (o a fine parola) entro `max` caratteri. */
export function troncaTesto(testo: string, max: number): string {
  const t = testo.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const taglio = t.slice(0, max);
  const finefrase = Math.max(taglio.lastIndexOf(". "), taglio.lastIndexOf("; "));
  if (finefrase > max * 0.5) return taglio.slice(0, finefrase + 1);
  return taglio.slice(0, taglio.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Legge uno o più snapshot con la chiave pubblica (stesse tabelle e
 * stessa RLS di sola lettura usate dal sito).
 */
export async function leggiSnapshots(ids: string[]): Promise<Record<string, { data: any; updated_at: string }>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(url, chiave, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("snapshots").select("id, data, updated_at").in("id", ids);
  if (error) throw new Error(`Lettura snapshots fallita: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.id as string, { data: r.data, updated_at: r.updated_at as string }]));
}

/** Ore trascorse da un timestamp ISO. */
export function oreDa(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}
