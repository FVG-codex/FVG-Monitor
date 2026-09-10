"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  type VoceSupermercato,
  formattaFasceGiorno,
  giornoSettimana,
  statoAperturaSupermercato,
} from "@/lib/supermercati";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

export function SupermercatiMap({
  voci,
  centro,
  adesso,
}: {
  voci: VoceSupermercato[];
  centro: [number, number];
  adesso: string;
}) {
  // Udine (10/09/2026): tutte le voci hanno lat/lon null nel dato
  // fornito dall'utente — su quella provincia la mappa resta vuota,
  // l'elenco testuale a fianco è l'unica vista disponibile. Non un bug.
  const conCoordinate = voci.filter(
    (v): v is VoceSupermercato & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );
  const giorno = giornoSettimana(adesso);

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lon]}
          radius={7}
          pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.65 }}
        >
          <Popup>
            <strong>{v.nome}</strong> <StatoApertoBadge stato={statoAperturaSupermercato(v, adesso)} />
            <br />
            {v.indirizzo}, {v.comune}
            {v.telefono && (
              <>
                <br />
                Tel. {v.telefono}
              </>
            )}
            <br />
            {formattaFasceGiorno(v.orari[giorno])}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
