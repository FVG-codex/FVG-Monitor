"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  type DipartimentoPS,
  telefonoDipartimento,
  telHref,
  mapsDirectionsHref,
  totaliDipartimento,
  stileBadgeColore,
} from "@/lib/prontosoccorso";

// Stesso pattern di FarmacieMap.tsx/VeterinariMap.tsx. Un solo colore
// marker (nessun tentativo di sintetizzare "quanto è affollato" in un
// singolo colore/livello — il riquadro colori reali per codice triage è
// già nel popup, coerente col principio del progetto di non
// interpretare il dato oltre quello che la fonte dichiara): il raggio
// varia leggermente col totale pazienti, solo come indizio visivo, mai
// l'unica informazione (il numero esatto resta nel popup).
export function ProntoSoccorsoMap({
  dipartimenti,
  centro,
}: {
  dipartimenti: DipartimentoPS[];
  centro: [number, number];
}) {
  const conCoordinate = dipartimenti.filter(
    (d): d is DipartimentoPS & { lat: number; lon: number } => d.lat !== null && d.lon !== null
  );

  return (
    <MapContainer center={centro} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((d) => {
        const { inAttesa, inTrattamento } = totaliDipartimento(d);
        const telefono = telefonoDipartimento(d);
        const indicazioni = mapsDirectionsHref(d);
        const raggio = Math.min(6 + d.totalePazienti / 6, 14);
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lon]}
            radius={raggio}
            pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.65 }}
          >
            <Popup>
              <strong>{d.nome}</strong>
              <br />
              {d.indirizzo}
              {d.indirizzo && d.comune ? ", " : ""}
              {d.comune}
              {d.info && (
                <>
                  <br />
                  <em>{d.info}</em>
                </>
              )}
              {telefono && (
                <>
                  <br />
                  Tel. <a href={`tel:${telHref(telefono)}`}>{telefono}</a>
                </>
              )}
              <br />
              <strong>
                {inAttesa} in attesa · {inTrattamento} in trattamento
              </strong>
              <div style={{ marginTop: 4 }}>
                {d.codiciColore.map((c) => (
                  <div key={c.id} style={{ fontSize: 11 }}>
                    <span
                      style={{
                        ...stileBadgeColore(c),
                        display: "inline-block",
                        padding: "0 4px",
                        borderRadius: 2,
                        border: "1px solid",
                        marginRight: 4,
                      }}
                    >
                      {c.descrizione}
                    </span>
                    {c.situazionePazienti.numeroPazientiInAttesa} in attesa · {c.situazionePazienti.numeroPazientiInVisita} in
                    trattamento · attesa media {c.situazionePazienti.mediaAttesa}
                  </div>
                ))}
              </div>
              {indicazioni && (
                <a href={indicazioni} target="_blank" rel="noopener noreferrer">
                  Indicazioni →
                </a>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
