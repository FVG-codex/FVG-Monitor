import { getMoonTimes } from "suncalc";

// Sole e luna (04/09/2026) — a differenza degli altri dati del sito, alba/
// tramonto/crepuscoli e fase lunare non arrivano da un ingest/Supabase: sono
// calcolati al volo nel browser con la libreria `suncalc` (posizione
// solare/lunare, formule standard, nessuna chiamata di rete). Un unico
// riferimento geografico per tutta la regione: le differenze fra le 4
// province sono di 1-3 minuti al massimo, irrilevanti per un dato mostrato
// con la precisione del minuto — non vale la complessità di un calcolo per
// provincia (a differenza di vento/pioggia/fiumi, che sono misure reali di
// stazioni specifiche, non geometria).
//
// Coordinate del riferimento: Udine, punto pressoché centrale del FVG.
export const FVG_LAT = 46.0693;
export const FVG_LON = 13.2346;

// Verificato il 04/09/2026 contro alba-tramonto.org e moongiant.com per
// Udine, 4 settembre 2026: alba/tramonto/crepuscoli entro 1-2 minuti dal
// riferimento, fase lunare "Ultimo quarto" 48% (calcolato: 49%) — scarto
// coerente con l'arrotondamento e con le coordinate non identiche usate
// dai due siti.

/**
 * Nome italiano della fase lunare a partire dal valore `phase` restituito da
 * suncalc.getMoonIllumination() (0 = luna nuova, 0.25 = primo quarto,
 * 0.5 = luna piena, 0.75 = ultimo quarto, 1 → di nuovo nuova).
 *
 * Le quattro fasi "puntuali" (nuova/primo quarto/piena/ultimo quarto) hanno
 * una finestra di tolleranza di ±0.02 (circa ±0.6 giorni su un ciclo di
 * 29,53 giorni) per evitare che un giorno "quasi esatto" venga etichettato
 * come gibbosa/crescente per un arrotondamento di poche ore — lo stesso
 * criterio usato dai calendari lunari comuni.
 */
export function nomeFaseLunare(phase: number): string {
  const p = ((phase % 1) + 1) % 1; // normalizza in [0, 1)
  const TOLLERANZA = 0.02;
  if (p < TOLLERANZA || p > 1 - TOLLERANZA) return "Luna nuova";
  if (Math.abs(p - 0.25) < TOLLERANZA) return "Primo quarto";
  if (Math.abs(p - 0.5) < TOLLERANZA) return "Luna piena";
  if (Math.abs(p - 0.75) < TOLLERANZA) return "Ultimo quarto";
  if (p < 0.25) return "Luna crescente";
  if (p < 0.5) return "Gibbosa crescente";
  if (p < 0.75) return "Gibbosa calante";
  return "Luna calante";
}

export type OrariLuna = {
  /** Sorgere della Luna nel giorno civile italiano richiesto, o `null` se
   * quel giorno non ne ha uno (vedi commento su `orariLunaOggi`). */
  sorge: Date | null;
  /** Tramontare della Luna nello stesso giorno civile, o `null` se assente. */
  tramonta: Date | null;
};

// Offset Europe/Rome (es. "+02:00"/"+01:00") per una data specifica —
// serve calcolarlo per data perché cambia con l'ora legale/solare.
// Mezzogiorno UTC come istante di riferimento: mai a cavallo di un cambio
// d'ora, quindi sempre sicuro per leggere l'offset del giorno civile.
function offsetRomaIso(anno: number, mese1: number, giorno: number): string {
  const riferimento = new Date(Date.UTC(anno, mese1 - 1, giorno, 12, 0, 0));
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    timeZoneName: "shortOffset",
  }).formatToParts(riferimento);
  const tz = parti.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = tz.match(/GMT([+-]\d+)(?::(\d+))?/);
  const oreOffset = match ? parseInt(match[1], 10) : 1;
  const minOffset = match?.[2] ? parseInt(match[2], 10) : 0;
  const segno = oreOffset >= 0 ? "+" : "-";
  return `${segno}${String(Math.abs(oreOffset)).padStart(2, "0")}:${String(minOffset).padStart(2, "0")}`;
}

// Istante reale di mezzanotte Europe/Rome per la data civile Y/M/D data.
function mezzanotteRoma(anno: number, mese1: number, giorno: number): Date {
  const offset = offsetRomaIso(anno, mese1, giorno);
  const mm = String(mese1).padStart(2, "0");
  const dd = String(giorno).padStart(2, "0");
  return new Date(`${anno}-${mm}-${dd}T00:00:00${offset}`);
}

/**
 * Sorgere e tramontare della Luna per il giorno civile italiano che
 * contiene `riferimento` (di default "adesso").
 *
 * A differenza del Sole — che alla latitudine del FVG sorge e tramonta
 * sempre esattamente una volta al giorno — la Luna sorge circa 50 minuti
 * più tardi ogni giorno: di conseguenza circa una volta al mese un giorno
 * di calendario resta senza un sorgere (o senza un tramontare). Non è un
 * errore né un caso limite raro da ignorare: è un evento astronomico
 * reale, verificato su un anno di date per queste coordinate (~1 giorno
 * su 28-30 senza sorgere, e altrettanto senza tramontare) — va mostrato
 * come tale, mai sostituito da un valore inventato o dall'orario del
 * giorno più vicino.
 *
 * Insidia di fuso orario scoperta scrivendo questa funzione:
 * `suncalc.getMoonTimes()` calcola sempre su una finestra di 24 ore
 * allineata alla MEZZANOTTE UTC del giorno dell'istante passato, non al
 * giorno civile italiano — passare direttamente "adesso", o anche una
 * mezzanotte italiana "finta" costruita con `Date.UTC(anno, mese, giorno)`
 * (stesso trucco usato altrove in questo file), produce eventi attribuiti
 * al giorno di calendario SBAGLIATO proprio nelle prime 1-2 ore della
 * giornata italiana (l'offset Italia/UTC) — verificato empiricamente: un
 * sorgere reale delle 00:16 del 6 settembre 2026 risultava attribuito
 * invece al 5 settembre con l'approccio ingenuo. Per questo si
 * interrogano tre finestre UTC consecutive (`getMoonTimes` per ieri, oggi
 * e domani secondo il calendario UTC) e si raccolgono tutti gli eventi
 * restituiti come istanti reali, filtrando poi solo quelli che cadono
 * davvero dentro la finestra [mezzanotte Roma di oggi, mezzanotte Roma di
 * domani) — indipendente da quale "giorno UTC" la libreria li assegna.
 *
 * Verificato il 06/09/2026 contro l'API ufficiale USNO
 * (aa.usno.navy.mil/api/rstt/oneday) per Udine, 6 e 7 settembre 2026:
 * sorgere e tramontare entro 1 minuto dal riferimento per entrambe le
 * date (00:16/17:12 e 01:33/17:51 calcolati contro 00:17/17:12 e
 * 01:34/17:52 USNO).
 */
export function orariLunaOggi(riferimento: Date = new Date()): OrariLuna {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(riferimento);
  const get = (tipo: string) => Number(parti.find((p) => p.type === tipo)?.value ?? "0");
  const anno = get("year");
  const mese1 = get("month");
  const giorno = get("day");

  const inizio = mezzanotteRoma(anno, mese1, giorno);
  const domani = new Date(Date.UTC(anno, mese1 - 1, giorno + 1));
  const fine = mezzanotteRoma(domani.getUTCFullYear(), domani.getUTCMonth() + 1, domani.getUTCDate());

  const risalite: Date[] = [];
  const tramonti: Date[] = [];
  for (let deltaGiorni = -1; deltaGiorni <= 1; deltaGiorni++) {
    const base = new Date(Date.UTC(anno, mese1 - 1, giorno + deltaGiorni));
    const t = getMoonTimes(base, FVG_LAT, FVG_LON);
    if (t.rise) risalite.push(t.rise);
    if (t.set) tramonti.push(t.set);
  }

  const nellaFinestra = (d: Date) => d >= inizio && d < fine;
  return {
    sorge: risalite.find(nellaFinestra) ?? null,
    tramonta: tramonti.find(nellaFinestra) ?? null,
  };
}
