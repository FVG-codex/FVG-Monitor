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
