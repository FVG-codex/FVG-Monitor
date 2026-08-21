"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Evento = {
  id: number;
  data: string;
  magnitudo: number;
  luogo: string;
  lat: number;
  lon: number;
  profonditaKm: number;
};

function coloreMagnitudo(mag: number): string {
  if (mag >= 3) return "#d9534f";
  if (mag >= 2) return "#e0a052";
  if (mag >= 1) return "#d9c548";
  return "#5FB3A3";
}

export function TerremotiMap({ eventi, centro }: { eventi: Evento[]; centro: [number, number] }) {
  return (
    <MapContainer center={centro} zoom={8} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {eventi.map((e) => (
        <CircleMarker
          key={e.id}
          center={[e.lat, e.lon]}
          radius={4 + e.magnitudo * 3}
          pathOptions={{ color: coloreMagnitudo(e.magnitudo), fillColor: coloreMagnitudo(e.magnitudo), fillOpacity: 0.55 }}
        >
          <Popup>
            <strong>M{e.magnitudo.toFixed(1)}</strong> — {e.luogo}
            <br />
            {new Date(e.data).toLocaleString("it-IT")}
            <br />
            Profondità: {e.profonditaKm.toFixed(1)} km
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
