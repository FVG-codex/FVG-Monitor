import type { CapacitorConfig } from "@capacitor/cli";

// App Android/iOS di FVG Monitor (19/10/2026).
//
// L'app è un guscio nativo che carica il sito di produzione
// (server.url): ogni deploy su Vercel aggiorna anche le app, senza
// passare dalla revisione degli store. www/ contiene solo la pagina di
// riserva mostrata quando il sito non si raggiunge (errorPath).
//
// Link verso altri domini: Capacitor li apre nel browser di sistema
// (non sono in allowNavigation), quindi le fonti esterne non
// "rubano" la finestra dell'app.
const config: CapacitorConfig = {
  appId: "it.fvg.monitor",
  appName: "FVG Monitor",
  webDir: "www",
  // Aggiunto allo user agent: il sito (e Google Analytics) possono
  // distinguere le visite dall'app da quelle del browser.
  appendUserAgent: "FVGMonitorApp",
  backgroundColor: "#0E2529",
  server: {
    url: "https://monitor.fvg.it",
    errorPath: "offline.html",
    androidScheme: "https",
  },
  ios: {
    // Le safe area le gestisce il sito via CSS (viewport-fit=cover).
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Android: Capacitor inietta --safe-area-inset-* come variabili
      // CSS, lette da app/globals.css del sito.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0E2529",
      showSpinner: false,
    },
  },
};

export default config;
