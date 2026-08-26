"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type FarmaciaTurno = {
  nome: string;
  comune: string | null;
  indirizzo: string | null;
  telefono: string | null;
  lat: number | null;
  lon: number | null;
  turni: { da: string; a: string | null }[];
};

// Estrae "HH:MM" direttamente dalla stringa ISO, senza passare da Date
// (stesso motivo documentato in ingest-light.mjs: non è garantito che
// l'ora nel dataset sia UTC, e gli orari osservati sono coerenti solo
// con "ora locale già inclusa nella stringa").
function orario(iso: string): string {
  return iso.slice(11, 16);
}

function formattaTurno(t: { da: string; a: string | null }): string {
  const giornoDa = t.da.slice(0, 10);
  const finisceDomani = t.a && t.a.slice(0, 10) !== giornoDa;
  return `${orario(t.da)} – ${t.a ? orario(t.a) : "?"}${finisceDomani ? " (giorno succ.)" : ""}`;
}

export function FarmacieMap({ farmacie, centro }: { farmacie: FarmaciaTurno[]; centro: [number, number] }) {
  const conCoordinate = farmacie.filter(
    (f): f is FarmaciaTurno & { lat: number; lon: number } => f.lat !== null && f.lon !== null
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
            <strong>{f.nome}</strong>
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
            {f.turni.map((t, ti) => (
              <div key={ti}>Turno: {formattaTurno(t)}</div>
            ))}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
