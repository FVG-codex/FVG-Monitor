"use client";

import { MapContainer, TileLayer, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type SegmentoCiclabile, formattaLunghezza } from "@/lib/pisteCiclabili";

// Colore riusato dalla palette esistente (tailwind.config.ts, già
// verificato per contrasto) — un solo colore per tutti i tracciati:
// niente campo utile per distinguerli via colore (il campo "livello" è
// quasi sempre "locale", vedi nota in ingestPisteCiclabili() dentro
// scripts/ingest-light.mjs), a differenza di Aviazione/Farmacie.
const COLORE_TRACCIATO = "#5FB3A3"; // cool

export function PisteCiclabiliMap({
  segmenti,
  centro,
}: {
  segmenti: SegmentoCiclabile[];
  centro: [number, number];
}) {
  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {segmenti.map((s, si) =>
        s.linee.map((linea, li) => (
          <Polyline
            key={`${s.id ?? s.nome}-${si}-${li}`}
            positions={linea}
            pathOptions={{ color: COLORE_TRACCIATO, weight: 4, opacity: 0.75 }}
          >
            <Popup>
              <strong>{s.nome}</strong>
              {s.lunghezzaM !== null && (
                <>
                  <br />
                  {formattaLunghezza(s.lunghezzaM)}
                </>
              )}
              {s.origineDa && (
                <>
                  <br />
                  Fonte: {s.origineDa}
                </>
              )}
            </Popup>
          </Polyline>
        ))
      )}
    </MapContainer>
  );
}
