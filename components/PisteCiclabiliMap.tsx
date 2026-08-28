"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Colori riusati dalla palette esistente (tailwind.config.ts, già
// verificato per contrasto) — un colore per fonte/serie, così le 5 fonti
// (Regione + le 4 serie turismofvg.it) si distinguono a colpo d'occhio
// sulla mappa (28/08/2026: da 2 a 5 fonti, ognuna col proprio box in UI
// — vedi PisteCiclabiliPage.tsx). 5 tinte ben separate, nessun colore
// nuovo inventato: teal/terracotta già in uso per questa mappa, blu/
// giallo dalla palette delle zone di allertamento, verde dalla palette
// delle allerte meteo — evitati i toni rosso/arancio-rosso (zone.d,
// allerta.rossa) per non confondersi con COLORE_EVIDENZIATO sotto.
const COLORE_REGIONE = "#5FB3A3"; // cool
const COLORE_SERIE: Record<"r" | "p" | "c" | "m", string> = {
  r: "#CD7554", // warm — anelli (prima fonte turismofvg.it aggiunta, 28/08/2026)
  p: "#6FA9E0", // zone.a — percorsi lineari
  c: "#E8B93E", // zone.c / allerta.gialla — ciclovie a tappe
  m: "#4C9A5B", // allerta.verde — mountain bike
};
// Evidenziazione al click sul nome nell'elenco (27/08/2026, richiesto
// dall'utente: "cliccando sopra il nome, che appaia sulla mappa") —
// colore ben distinto (allerta.rossa) più tratto più spesso, uguale per
// tutte le fonti così il percorso selezionato risalta comunque.
const COLORE_EVIDENZIATO = "#C1382E"; // allerta.rossa

// Etichetta fonte per il popup di un tracciato.
const ETICHETTA_FONTE: Record<TracciatoMappa["fonte"], string> = {
  regione: "Regione FVG",
  r: "TurismoFVG · Anelli",
  p: "TurismoFVG · Percorsi lineari",
  c: "TurismoFVG · Ciclovie a tappe",
  m: "TurismoFVG · Mountain bike",
};

// Un "tracciato" sulla mappa, indipendente dalla fonte — vedi
// PisteCiclabiliPage.tsx per come viene costruito a partire dai
// segmenti Regione e dai percorsi delle 4 serie turismofvg.it. `chiave`
// è univoca fra tutte le fonti (prefissata con la fonte) ed è quella
// usata per l'evidenziazione al click nell'elenco.
export type TracciatoMappa = {
  chiave: string;
  fonte: "regione" | "r" | "p" | "c" | "m";
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
        const colore = t.fonte === "regione" ? COLORE_REGIONE : COLORE_SERIE[t.fonte];
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
              Fonte: {ETICHETTA_FONTE[t.fonte]}
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
