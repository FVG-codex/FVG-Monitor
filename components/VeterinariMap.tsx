"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  type VoceVeterinario,
  formattaFasceGiornoVet,
  giornoSettimana,
  statoAperturaVeterinario,
  LIVELLO_EMERGENZA,
} from "@/lib/veterinari";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

export function VeterinariMap({
  voci,
  centro,
  adesso,
}: {
  voci: VoceVeterinario[];
  centro: [number, number];
  adesso: string;
}) {
  const conCoordinate = voci.filter(
    (v): v is VoceVeterinario & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );
  const giorno = giornoSettimana(adesso);

  return (
    <MapContainer center={centro} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((v) => {
        const livello = LIVELLO_EMERGENZA[v.gestioneEmergenze];
        // In risalto sulla mappa (marker rosso) le strutture con una
        // reale capacità di emergenza dichiarata — stesso principio del
        // riquadro "Emergenze" della pagina, non solo lì.
        const colore = livello.evidenzia ? "#C0392B" : "#5FB3A3";
        return (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lon]}
            radius={livello.evidenzia ? 8 : 6}
            pathOptions={{ color: colore, fillColor: colore, fillOpacity: 0.7 }}
          >
            <Popup>
              <strong>{v.nome}</strong> <StatoApertoBadge stato={statoAperturaVeterinario(v, adesso)} />
              <br />
              {v.tipoStruttura}
              <br />
              {v.indirizzo}, {v.comune}
              {v.telefono && (
                <>
                  <br />
                  Tel. {v.telefono}
                </>
              )}
              <br />
              Oggi: {formattaFasceGiornoVet(v.orari[giorno])}
              <br />
              <strong>Emergenze:</strong> {livello.etichetta}
              {v.telefonoEmergenze && (
                <>
                  <br />
                  Tel. emergenze: {v.telefonoEmergenze}
                </>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
