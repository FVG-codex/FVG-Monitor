"use client";

import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Colonnina } from "@/lib/colonnineElettriche";

// Colori riusati dalla palette esistente del sito (tailwind.config.ts,
// già verificata per il contrasto in Fase 4 — Accessibilità) invece di
// introdurne di nuovi da ricontrollare — stesso principio delle altre
// mappe del sito (TerremotiMap.tsx, AviazioneMap.tsx).
function coloreStato(operativo: boolean | null): string {
  if (operativo === true) return "#5FB3A3"; // cool — operativa
  if (operativo === false) return "#C1382E"; // allerta.rossa — non operativa
  return "#92AAA8"; // ink-faint — stato non noto (vedi nota su /v3/referencedata)
}

const COLORE_POSIZIONE = "#6FA9E0"; // zone.a

export function ColonnineElettricheMap({
  colonnine,
  centro,
  posizione,
  raggioKm,
}: {
  colonnine: Colonnina[];
  centro: [number, number];
  posizione: [number, number] | null;
  raggioKm: number;
}) {
  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {posizione && (
        <>
          <Circle
            center={posizione}
            radius={raggioKm * 1000}
            pathOptions={{ color: COLORE_POSIZIONE, fillColor: COLORE_POSIZIONE, fillOpacity: 0.07, weight: 1.5 }}
          />
          <CircleMarker
            center={posizione}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: COLORE_POSIZIONE, fillOpacity: 1, weight: 2 }}
          >
            <Popup>La tua posizione</Popup>
          </CircleMarker>
        </>
      )}

      {colonnine.map((c) => (
        <CircleMarker
          key={c.uuid}
          center={[c.lat, c.lon]}
          radius={6}
          pathOptions={{ color: coloreStato(c.operativo), fillColor: coloreStato(c.operativo), fillOpacity: 0.7 }}
        >
          <Popup>
            <strong>{c.nome ?? "Colonnina"}</strong>
            <br />
            {[c.indirizzo, c.comune].filter(Boolean).join(", ")}
            {c.operatore && (
              <>
                <br />
                Operatore: {c.operatore}
              </>
            )}
            {c.prese.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {c.prese.map((p, i) => (
                  <div key={i}>
                    {p.tipo ?? "Presa"} · {p.potenzaKw ? `${p.potenzaKw} kW` : "potenza n.d."} · ×{p.quantita}
                  </div>
                ))}
              </div>
            )}
            {c.costo && (
              <>
                <br />
                Costo: {c.costo}
              </>
            )}
            {c.stato && (
              <>
                <br />
                Stato: {c.stato}
              </>
            )}
            <br />
            <span style={{ fontSize: "11px", opacity: 0.75 }}>
              {c.verificatoIl
                ? `Verificato il ${new Date(c.verificatoIl).toLocaleDateString("it-IT")} (OpenChargeMap)`
                : "Data di verifica non disponibile (OpenChargeMap)"}
            </span>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
