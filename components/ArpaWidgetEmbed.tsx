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
 *
 * Nota: lo script ARPA prova a fare una richiesta di rete aggiuntiva
 * includendo l'indirizzo dell'iframe come parametro — che con srcDoc è
 * sempre "about:srcdoc" (comportamento fisso del browser, non
 * dipendente dal sandbox), quindi quella richiesta fallisce con 404.
 * È innocuo: il contenuto principale del widget si carica comunque
 * correttamente. Provato ad aggiungere allow-same-origin per
 * sistemarlo, ma non risolve il problema (l'indirizzo resta
 * "about:srcdoc" in ogni caso) e introduce solo un avviso di sicurezza
 * del browser — quindi si resta con il sandbox più restrittivo.
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
