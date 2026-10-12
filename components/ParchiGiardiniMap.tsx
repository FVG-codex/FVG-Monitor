"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type VoceParcoGiardino } from "@/lib/parchigiardini";

export function ParchiGiardiniMap({
  voci,
  centro,
}: {
  voci: VoceParcoGiardino[];
  centro: [number, number];
}) {
  const conCoordinate = voci.filter(
    (v): v is VoceParcoGiardino & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((v, i) => (
        <CircleMarker
          key={`${v.pk}-${i}`}
          center={[v.lat, v.lon]}
          radius={6}
          pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.65 }}
        >
          <Popup>
            <strong>{v.nome}</strong>
            <div className="capitalize">{v.tipoEtichetta.replace(/\//g, " · ")}</div>
            <div>
              {v.comune}
              {v.localita ? ` — ${v.localita}` : ""}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
