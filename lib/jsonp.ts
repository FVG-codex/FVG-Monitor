// Helper generico per consumare endpoint JSONP direttamente dal
// browser — inietta un tag <script>, definisce una funzione di
// callback univoca sull'oggetto window, e la rimuove non appena
// chiamata (o in caso di timeout/errore).
let contatoreJsonp = 0;

export function fetchJsonp(url: string, opzioni?: { timeoutMs?: number; nomeCallback?: string }): Promise<unknown> {
  const timeoutMs = opzioni?.timeoutMs ?? 8000;
  return new Promise((resolve, reject) => {
    const nomeCallback = opzioni?.nomeCallback ?? `jsonp_cb_${Date.now()}_${contatoreJsonp++}`;
    const script = document.createElement("script");
    let concluso = false;

    const pulisci = () => {
      delete (window as unknown as Record<string, unknown>)[nomeCallback];
      script.remove();
    };

    const timeout = setTimeout(() => {
      if (concluso) return;
      concluso = true;
      pulisci();
      reject(new Error("Timeout JSONP"));
    }, timeoutMs);

    (window as unknown as Record<string, unknown>)[nomeCallback] = (dati: unknown) => {
      if (concluso) return;
      concluso = true;
      clearTimeout(timeout);
      pulisci();
      resolve(dati);
    };

    const separatore = url.includes("?") ? "&" : "?";
    script.src = `${url}${separatore}callback=${nomeCallback}`;
    script.onerror = () => {
      if (concluso) return;
      concluso = true;
      clearTimeout(timeout);
      pulisci();
      reject(new Error("Errore caricamento script JSONP"));
    };
    document.head.appendChild(script);
  });
}
