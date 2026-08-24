"use client";

import { useState } from "react";

export type Webcam = {
  nome: string;
  zona: string;
  provincia: string | null;
  immagine: string;
  descrizione: string | null;
  link: string | null;
};

export function WebcamCard({ webcam }: { webcam: Webcam }) {
  const [fallita, setFallita] = useState(false);

  const contenuto = (
    <>
      {fallita ? (
        <div className="w-full h-32 bg-panel-alt flex items-center justify-center text-ink-faint text-[11px] font-mono text-center px-2">
          Anteprima non disponibile
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={webcam.immagine}
          alt={webcam.nome}
          loading="lazy"
          className="w-full h-32 object-cover"
          onError={() => setFallita(true)}
        />
      )}
      <div className="p-2">
        <div className="font-cond font-semibold text-sm leading-tight">
          {webcam.nome}
          {webcam.link && <span className="sr-only"> (si apre in una nuova scheda)</span>}
        </div>
        <div className="font-mono text-[10px] text-ink-faint mt-0.5">{webcam.zona}</div>
      </div>
    </>
  );

  if (webcam.link) {
    return (
      <a
        href={webcam.link}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-line rounded overflow-hidden bg-panel hover:border-cool transition-colors"
      >
        {contenuto}
      </a>
    );
  }
  return <div className="border border-line rounded overflow-hidden bg-panel">{contenuto}</div>;
}
