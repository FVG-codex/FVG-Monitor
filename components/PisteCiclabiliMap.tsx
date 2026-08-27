"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type SegmentoCiclabile, formattaLunghezza } from "@/lib/pisteCiclabili";

// Colore riusato dalla palette esistente (tailwind.config.ts, già
// verificato per contrasto) — un solo colore per tutti i tracciati:
// niente campo utile per distinguerli via colore (il campo "livello" è
// quasi sempre "locale", vedi nota in ingestPisteCiclabili() dentro
// scripts/ingest-light.mjs), a differenza di Aviazione/Farmacie.
const COLORE_TRACCIATO = "#5FB3A3"; // cool
// Evidenziazione al click sul nome nell'elenco (27/08/2026, richiesto
// dall'utente: "cliccando sopra il nome, che appaia sulla mappa") —
// colore ben distinto (allerta.rossa) più tratto più spesso, così il
// percorso selezionato risalta anche sovrapposto ad altri tracciati.
const COLORE_EVIDENZIATO = "#C1382E"; // allerta.rossa

export function PisteCiclabiliMap({
  segmenti,
  centro,
  evidenziato,
}: {
  segmenti: SegmentoCiclabile[];
  centro: [number, number];
  evidenziato: string | null;
}) {
  const mapRef = useRef<LeafletMap | null>(null);

  // Zoom automatico sul percorso selezionato: calcola i punti estremi di
  // tutte le sue linee e adatta la vista con fitBounds — coerente con
  // "che appaia sulla mappa" della richiesta originale, non solo un
  // cambio di colore facilmente perso di vista se il percorso è piccolo
  // o fuori dalla vista corrente.
  useEffect(() => {
    if (!mapRef.current) return;
    if (!evidenziato) {
      // Nessuna selezione (stato iniziale, o dopo "Mostra tutta la
      // mappa" nel pannello Elenco) — vista di default sull'intero
      // dataset, non un semplice "non fare nulla" che lascerebbe la
      // mappa ferma sull'ultimo percorso zoomato.
      mapRef.current.setView(centro, 9);
      return;
    }
    const punti = segmenti
      .filter((s) => s.nome === evidenziato)
      .flatMap((s) => s.linee)
      .flat();
    if (punti.length === 0) return;
    mapRef.current.fitBounds(L.latLngBounds(punti), { padding: [24, 24], maxZoom: 15 });
  }, [evidenziato, segmenti, centro]);

  return (
    <MapContainer ref={mapRef} center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {segmenti.map((s, si) => {
        const isEvidenziato = s.nome === evidenziato;
        return s.linee.map((linea, li) => (
          <Polyline
            key={`${s.id ?? s.nome}-${si}-${li}`}
            positions={linea}
            pathOptions={{
              color: isEvidenziato ? COLORE_EVIDENZIATO : COLORE_TRACCIATO,
              weight: isEvidenziato ? 6 : 4,
              opacity: !evidenziato || isEvidenziato ? 0.85 : 0.35,
            }}
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
        ));
      })}
    </MapContainer>
  );
}
