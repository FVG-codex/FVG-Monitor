// Mappa il locale di next-intl (it/en/de/...) al tag BCP 47 da passare
// a `toLocaleDateString()`/`toLocaleString()`/`toLocaleTimeString()` e
// simili. Introdotto il 05/10/2026, quando l'aggiunta del tedesco ha
// reso insufficiente il ternario `locale === "en" ? "en-GB" : "it-IT"`
// ripetuto finora in una ventina di punti del codice (ogni pagina che
// formatta una data in modo locale-aware) — con 3+ lingue un ternario a
// due rami non basta più. Centralizzato qui: aggiungere una lingua
// futura (sloveno, croato) significa aggiungere una riga a questa
// mappa, non toccare ogni componente che formatta una data.
const INTL_LOCALE: Record<string, string> = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
};

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? "it-IT";
}
