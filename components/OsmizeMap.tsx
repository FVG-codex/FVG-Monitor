"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type VoceOsmiza } from "@/lib/osmize";

// Mappa statica per Osmize (13/10/2026) — stesso pattern di
// ParchiGiardiniMap.tsx, ma su dataset statico (lib/data/osmize.json)
// invece che su uno snapshot Supabase. Le coordinate vengono dalla mappa
// incorporata in ciascuna pagina di dettaglio di osmize.com (vedi
// lib/osmize.ts per la fonte completa).
export function OsmizeMap({ voci, centro }: { voci: VoceOsmiza[]; centro: [number, number] }) {
  const conCoordinate = voci.filter(
    (v): v is VoceOsmiza & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );

  return (
    <MapContainer center={centro} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((v, i) => (
        <CircleMarker
          key={`${v.url}-${i}`}
          center={[v.lat, v.lon]}
          radius={6}
          pathOptions={{ color: "#C97B3D", fillColor: "#C97B3D", fillOpacity: 0.7 }}
        >
          <Popup>
            <strong>{v.nome}</strong>
            <div>{v.localita}</div>
            {v.indirizzo && <div>{v.indirizzo}</div>}
            <div>
              <a href={v.url} target="_blank" rel="noopener noreferrer">
                osmize.com ↗
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
