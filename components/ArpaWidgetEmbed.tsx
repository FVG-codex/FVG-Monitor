"use client";

/**
 * Gli script dei widget ARPA FVG usano document.write() per
 * iniettarsi nella pagina — funziona solo durante il caricamento
 * iniziale di un documento, non se eseguito dinamicamente in una
 * pagina React già caricata (rischierebbe di svuotare l'intera
 * pagina). La soluzione è farlo girare in un iframe isolato, dove
 * document.write() scrive solo nel proprio documento.
 *
 * L'altezza è indicativa (il widget ARPA in formato "h-extended" è
 * una card compatta orizzontale) — aggiustala guardando il risultato
 * reale una volta deployato.
 */
export function ArpaWidgetEmbed({ scriptUrl, height = 210 }: { scriptUrl: string; height?: number }) {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: transparent; }
  </style>
</head>
<body>
  <script src="${scriptUrl}"></script>
</body>
</html>`;

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ width: "100%", height, border: "none", background: "transparent" }}
      title="Widget meteo ARPA FVG"
    />
  );
}
