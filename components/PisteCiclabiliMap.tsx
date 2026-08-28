"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Colori riusati dalla palette esistente (tailwind.config.ts, già
// verificato per contrasto) — un colore per fonte, così le due fonti si
// distinguono a colpo d'occhio sulla mappa (28/08/2026, seconda fonte
// turismofvg.it aggiunta accanto ai dati Regione).
const COLORE_REGIONE = "#5FB3A3"; // cool
const COLORE_TURISMOFVG = "#CD7554"; // warm
// Evidenziazione al click sul nome nell'elenco (27/08/2026, richiesto
// dall'utente: "cliccando sopra il nome, che appaia sulla mappa") —
// colore ben distinto (allerta.rossa) più tratto più spesso, uguale per
// entrambe le fonti così il percorso selezionato risalta comunque.
const COLORE_EVIDENZIATO = "#C1382E"; // allerta.rossa

// Un "tracciato" sulla mappa, indipendente dalla fonte — vedi
// PisteCiclabiliPage.tsx per come viene costruito a partire dai
// segmenti Regione e dai percorsi turismofvg.it. `chiave` è univoca fra
// le due fonti (prefissata con la fonte) ed è quella usata per
// l'evidenziazione al click nell'elenco.
export type TracciatoMappa = {
  chiave: string;
  fonte: "regione" | "turismofvg";
  nome: string;
  linee: [number, number][][];
  // Riga aggiuntiva nel popup (es. "R001 · media · 2:15 h" per
  // turismofvg) — null quando non c'è nulla di utile da aggiungere.
  extra?: string | null;
};

export function PisteCiclabiliMap({
  tracciati,
  centro,
  evidenziato,
}: {
  tracciati: TracciatoMappa[];
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
    const punti = tracciati
      .filter((t) => t.chiave === evidenziato)
      .flatMap((t) => t.linee)
      .flat();
    if (punti.length === 0) return;
    mapRef.current.fitBounds(L.latLngBounds(punti), { padding: [24, 24], maxZoom: 15 });
  }, [evidenziato, tracciati, centro]);

  return (
    <MapContainer ref={mapRef} center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {tracciati.map((t, ti) => {
        const isEvidenziato = t.chiave === evidenziato;
        const colore = t.fonte === "turismofvg" ? COLORE_TURISMOFVG : COLORE_REGIONE;
        return t.linee.map((linea, li) => (
          <Polyline
            key={`${t.chiave}-${ti}-${li}`}
            positions={linea}
            pathOptions={{
              color: isEvidenziato ? COLORE_EVIDENZIATO : colore,
              weight: isEvidenziato ? 6 : 4,
              opacity: !evidenziato || isEvidenziato ? 0.85 : 0.35,
            }}
          >
            <Popup>
              <strong>{t.nome}</strong>
              <br />
              Fonte: {t.fonte === "turismofvg" ? "TurismoFVG" : "Regione FVG"}
              {t.extra && (
                <>
                  <br />
                  {t.extra}
                </>
              )}
            </Popup>
          </Polyline>
        ));
      })}
    </MapContainer>
  );
}
