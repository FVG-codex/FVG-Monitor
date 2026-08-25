"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Aviostruttura, CategoriaAviostruttura } from "@/lib/aviostrutture";

// Colori riusati dalla palette esistente del sito (tailwind.config.ts,
// già verificata per il contrasto in Fase 4 — Accessibilità) invece di
// introdurne di nuovi da ricontrollare — stesso principio delle altre
// mappe del sito (TerremotiMap.tsx).
const COLORE_CATEGORIA: Record<CategoriaAviostruttura, string> = {
  "aeroporto-civile": "#5FB3A3", // cool
  "aeroporto-militare": "#C1382E", // allerta.rossa
  aviosuperficie: "#6FA9E0", // zone.a
  "campo-volo": "#E8B93E", // zone.c
  "pista-dismessa": "#92AAA8", // ink-faint — dismessa, colore neutro/spento
};

export function AviazioneMap({ strutture, centro }: { strutture: Aviostruttura[]; centro: [number, number] }) {
  const conCoordinate = strutture.filter((s): s is Aviostruttura & { lat: number; lon: number } => s.lat !== null && s.lon !== null);

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((s) => (
        <CircleMarker
          key={s.urlFonte ?? s.nome}
          center={[s.lat, s.lon]}
          radius={7}
          pathOptions={{
            color: COLORE_CATEGORIA[s.categoria],
            fillColor: COLORE_CATEGORIA[s.categoria],
            fillOpacity: 0.65,
          }}
        >
          <Popup>
            <strong>{s.nome}</strong>
            <br />
            {s.tipo}
            <br />
            {s.comune} ({s.provincia}){s.localita ? ` — ${s.localita}` : ""}
            {s.icao && (
              <>
                <br />
                ICAO: {s.icao}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
