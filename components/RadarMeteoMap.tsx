"use client";

import { MapContainer, TileLayer, ImageOverlay } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export function RadarMeteoMap({
  immagine,
  bounds,
  centro,
}: {
  immagine: string;
  bounds: [[number, number], [number, number]];
  centro: [number, number];
}) {
  return (
    <MapContainer center={centro} zoom={8} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ImageOverlay url={immagine} bounds={bounds} opacity={0.75} />
    </MapContainer>
  );
}
