"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import {
  type VoceDentista,
  formattaFasceGiornoDentista,
  giornoSettimana,
  statoAperturaDentista,
} from "@/lib/dentisti";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

// Stesso pattern di ricentraggio imperativo di VeterinariMap.tsx — vedi
// quel commento per il perché (react-leaflet 4.2.1 applica center/zoom
// solo al primo montaggio).
function RicentraMappa({ centro, zoom }: { centro: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centro[0], centro[1], zoom]);
  return null;
}

export function DentistiMap({
  voci,
  centro,
  zoom = 11,
  adesso,
}: {
  voci: VoceDentista[];
  centro: [number, number];
  zoom?: number;
  adesso: string;
}) {
  const t = useTranslations("dentisti");
  const tChrome = useTranslations("chrome");
  const conCoordinate = voci.filter(
    (v): v is VoceDentista & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );
  const giorno = giornoSettimana(adesso);

  // Censimento iniziale (06/10/2026): TUTTE le strutture di Trieste
  // mancano ancora di coordinate (vedi nota in lib/dentisti.ts) — a
  // differenza di Veterinari, dove solo poche voci ne erano prive, qui
  // la mappa sarebbe quasi sempre vuota. Messaggio esplicito invece di
  // una mappa silenziosamente senza marker, che sembrerebbe un errore;
  // sparisce da solo quando la versione verificata aggiungerà le
  // coordinate (non c'è nessun controllo speciale da rimuovere).
  if (conCoordinate.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 bg-panel-alt">
        <p className="text-ink-faint text-sm font-mono text-center">{t("nessunaCoordinata")}</p>
      </div>
    );
  }

  return (
    <MapContainer center={centro} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <RicentraMappa centro={centro} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {conCoordinate.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lon]}
          radius={6}
          pathOptions={{ color: "#5FB3A3", fillColor: "#5FB3A3", fillOpacity: 0.7 }}
        >
          <Popup>
            <strong>{v.nome}</strong> <StatoApertoBadge stato={statoAperturaDentista(v, adesso)} />
            <br />
            {v.tipoStruttura}
            <br />
            {v.indirizzo}, {v.comune}
            {v.telefono && (
              <>
                <br />
                {tChrome("telEtichetta", { telefono: v.telefono })}
              </>
            )}
            <br />
            {t("oggiLabel")}{" "}
            {formattaFasceGiornoDentista(v.orari[giorno], t("orarioNonPubblicato"), t("chiuso"))}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
