"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import { type VoceGuardiaMedica } from "@/lib/guardiemediche";

export function GuardieMedicheMap({
  sedi,
  centro,
}: {
  sedi: VoceGuardiaMedica[];
  centro: [number, number];
}) {
  const t = useTranslations("guardieMediche");
  const conCoordinate = sedi.filter(
    (s): s is VoceGuardiaMedica & { lat: number; lon: number } => s.lat !== null && s.lon !== null
  );

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((s, i) => (
        <CircleMarker
          key={`${s.comune}-${i}`}
          center={[s.lat, s.lon]}
          radius={7}
          pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.65 }}
        >
          <Popup>
            <strong>{s.comune}</strong>
            {s.azienda && <div>{s.azienda}</div>}
            {(s.via || s.presso) && (
              <div>
                {s.via}
                {s.via && s.presso ? " — " : ""}
                {s.presso}
              </div>
            )}
            {s.comuniCompresi && s.comuniCompresi.length > 0 && (
              <div>{t("comuniCompresi", { elenco: s.comuniCompresi.join(", ") })}</div>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
