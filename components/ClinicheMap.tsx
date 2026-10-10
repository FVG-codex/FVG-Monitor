"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import {
  type VoceClinica,
  formattaFasceGiornoClinica,
  giornoSettimana,
  statoAperturaClinica,
} from "@/lib/cliniche";
import { StatoApertoBadge } from "@/components/StatoApertoBadge";

// Stesso pattern di ricentraggio imperativo di DentistiMap.tsx/
// VeterinariMap.tsx — vedi quel commento per il perché (react-leaflet
// 4.2.1 applica center/zoom solo al primo montaggio).
function RicentraMappa({ centro, zoom }: { centro: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centro[0], centro[1], zoom]);
  return null;
}

// A differenza di DentistiMap.tsx/VeterinariMap.tsx, qui TUTTI i marker
// hanno lo stesso colore (teal) — nessun livello di urgenza da
// evidenziare in questa sezione, su richiesta esplicita dell'utente
// (10/10/2026). Il popup mostra `specialita` al posto dell'etichetta
// Emergenze.
export function ClinicheMap({
  voci,
  centro,
  zoom = 11,
  adesso,
}: {
  voci: VoceClinica[];
  centro: [number, number];
  zoom?: number;
  adesso: string;
}) {
  const t = useTranslations("cliniche");
  const tChrome = useTranslations("chrome");
  const conCoordinate = voci.filter(
    (v): v is VoceClinica & { lat: number; lon: number } => v.lat !== null && v.lon !== null
  );
  const giorno = giornoSettimana(adesso);

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
            <strong>{v.nome}</strong> <StatoApertoBadge stato={statoAperturaClinica(v, adesso)} />
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
            {t("oggiLabel")} {formattaFasceGiornoClinica(v.orari[giorno], t("orarioNonPubblicato"), t("chiuso"))}
            {v.specialita.length > 0 && (
              <>
                <br />
                <strong>{t("specialitaLabel")}</strong> {v.specialita.join(", ")}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
