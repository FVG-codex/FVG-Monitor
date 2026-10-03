// Modulo "Colonnine elettriche" (03/10/2026) — tipi condivisi e due
// funzioni di utilità lato client:
// - distanzaKm(): formula dell'emisenoverso (haversine) standard, usata
//   per il filtro "entro N km dalla mia posizione" sulla pagina
//   /colonnine-elettriche. Nessun dato esterno coinvolto, solo
//   geometria — non richiede verifica contro una fonte reale.
// - cercaLocalita(): geocodifica testuale (es. "Udine" → lat/lon) via
//   Nominatim (OpenStreetMap), chiamata DIRETTAMENTE dal browser di chi
//   visita il sito — stesso pattern già usato per Autobus (vedi
//   lib/autobus.ts) per fonti che preferiscono un IP residenziale a uno
//   di datacenter. Formato di risposta NON verificato con una richiesta
//   reale in questa sessione (Nominatim non era raggiungibile né da
//   questo sandbox né incollando manualmente) — è però un'API pubblica
//   stabile e ampiamente documentata da oltre un decennio; il codice
//   sotto resta comunque defensivo (array vuoto se la forma non torna).
//
// I dati delle colonnine stesse (ingestione, Supabase) sono documentati
// nel commento "COLONNINE ELETTRICHE" di scripts/ingest-light.mjs.

export type PresaColonnina = {
  tipo: string | null;
  potenzaKw: number | null;
  quantita: number;
};

export type Colonnina = {
  id: number;
  uuid: string;
  nome: string | null;
  indirizzo: string | null;
  comune: string | null;
  provincia: string | null;
  lat: number;
  lon: number;
  telefono: string | null;
  sito: string | null;
  operatore: string | null;
  tipoUso: string | null;
  costo: string | null;
  note: string | null;
  numeroPostazioni: number | null;
  stato: string | null;
  operativo: boolean | null;
  verificatoIl: string | null;
  prese: PresaColonnina[];
};

export type ColonnineElettricheData = {
  punti: Colonnina[];
  totale: number;
  aggiornato_al: string;
  fonte: string;
};

const RAGGIO_TERRA_KM = 6371;

export function distanzaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RAGGIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type RisultatoLocalita = { nome: string; lat: number; lon: number };

export async function cercaLocalita(query: string): Promise<RisultatoLocalita[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=it` +
    `&accept-language=it&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const dati = await res.json();
    if (!Array.isArray(dati)) return [];
    return dati
      .map((d) => {
        const lat = Number.parseFloat(d?.lat);
        const lon = Number.parseFloat(d?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { nome: typeof d?.display_name === "string" ? d.display_name : q, lat, lon };
      })
      .filter((r): r is RisultatoLocalita => r !== null);
  } catch {
    return [];
  }
}
