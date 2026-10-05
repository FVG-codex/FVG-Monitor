"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  type VoceVeterinario,
  formattaFasceGiornoVet,
  giornoSettimana,
  statoAperturaVeterinario,
  LIVELLO_EMERGENZA,
} from "@/lib/veterinari";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

// `MapContainer` di react-leaflet 4.2.1 usa le prop `center`/`zoom` SOLO
// al primo montaggio (verificato leggendo node_modules/react-leaflet/
// lib/MapContainer.js: la callback che crea la mappa ha dependency array
// vuoto e il controllo `context === null`, quindi `map.setView()` viene
// chiamato una sola volta). Cambiare `centro`/`zoom` da fuori — come
// quando si seleziona una provincia o un comune diverso — non muove una
// mappa già montata. Serve quindi ricentrare in modo imperativo con
// `useMap()` + `map.setView()` in un effect, pattern raccomandato da
// react-leaflet stesso per questo caso.
function RicentraMappa({ centro, zoom }: { centro: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centro[0], centro[1], zoom]);
  return null;
}

export function VeterinariMap({
  voci,
  centro,
  zoom = 11,
  adesso,
}: {
  voci: VoceVeterinario[];
  centro: [number, number];
  zoom?: number;
  adesso: string;
}) {
  const conCoordinate = voci.filter(
    (v): v is VoceVeterinario & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );
  const giorno = giornoSettimana(adesso);

  return (
    <MapContainer center={centro} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <RicentraMappa centro={centro} zoom={zoom} />
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
