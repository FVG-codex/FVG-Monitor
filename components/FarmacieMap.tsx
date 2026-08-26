"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type VoceFarmacia, formattaFascia, statoApertura } from "@/lib/farmacie";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

export function FarmacieMap({
  farmacie,
  centro,
  adesso,
}: {
  farmacie: VoceFarmacia[];
  centro: [number, number];
  adesso: string;
}) {
  const conCoordinate = farmacie.filter(
    (f): f is VoceFarmacia & { lat: number; lon: number } => f.lat !== null && f.lon !== null
  );

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((f, i) => (
        <CircleMarker
          key={`${f.nome}-${i}`}
          center={[f.lat, f.lon]}
          radius={7}
          pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.65 }}
        >
          <Popup>
            <strong>{f.nome}</strong>{" "}
            <StatoApertoBadge stato={statoApertura(f, adesso)} />
            <br />
            {f.indirizzo}
            {f.indirizzo && f.comune ? ", " : ""}
            {f.comune}
            {f.telefono && (
              <>
                <br />
                Tel. {f.telefono}
              </>
            )}
            {f.orariOggi.map((o, oi) => (
              <div key={oi}>{formattaFascia(o)}</div>
            ))}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
