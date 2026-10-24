// Integrazione con l'app Android/iOS (Capacitor, cartella mobile/) —
// 24/10/2026.
//
// Dentro l'app Capacitor inietta `window.Capacitor` nelle pagine del
// sito; nel browser normale non esiste e queste funzioni non fanno
// nulla. Niente import di @capacitor/core: il sito non deve dipendere
// dai pacchetti dell'app, si usa solo l'oggetto globale se presente.

type StileBarre = "DARK" | "LIGHT";

type CapacitorGlobale = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    SystemBars?: { setStyle?: (o: { style: StileBarre }) => Promise<void> };
  };
};

function capacitor(): CapacitorGlobale | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { Capacitor?: CapacitorGlobale }).Capacitor;
  return c && c.isNativePlatform?.() ? c : null;
}

/**
 * Colore di ora/batteria/icone nella barra di sistema, in base al tema
 * del sito: tema scuro → icone chiare ("DARK" = contenuto chiaro su
 * sfondo scuro, nomenclatura Capacitor), tema chiaro → icone scure.
 */
export function aggiornaBarreDiSistema(tema: "scuro" | "chiaro"): void {
  const c = capacitor();
  c?.Plugins?.SystemBars?.setStyle?.({ style: tema === "chiaro" ? "LIGHT" : "DARK" }).catch(() => {});
}
