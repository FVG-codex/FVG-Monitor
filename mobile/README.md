# FVG Monitor — app Android e iOS

App nativa costruita con **Capacitor 8**. È un guscio che carica il sito
di produzione **https://monitor.fvg.it** (`server.url` in
`capacitor.config.ts`): ogni deploy su Vercel aggiorna anche le app,
senza ripassare dalla revisione degli store. Serve una nuova versione
sugli store solo quando cambia la parte nativa (plugin, icone, permessi).

| Cosa | Valore |
|---|---|
| Bundle ID / applicationId | `it.fvg.monitor` |
| Nome | FVG Monitor |
| iOS minimo | 15.0 (pacchetti Swift Package Manager, niente CocoaPods) |
| Android | minSdk 24, target/compile SDK 36 |

## Struttura

- `capacitor.config.ts` — configurazione (URL del sito, safe area, splash).
- `www/` — solo la pagina `offline.html` mostrata quando il sito non si
  raggiunge (`index.html` è un segnaposto richiesto da Capacitor).
- `ios/`, `android/` — progetti nativi generati da Capacitor, già con
  icone e splash screen.
- `assets/` — immagini sorgente di icona e splash.
- `scripts/genera-icone.py` — rigenera le icone (sito + app).

Lato sito, l'app si appoggia a: `app/manifest.ts` (manifest PWA),
`viewport` in `app/[locale]/layout.tsx` (`viewport-fit=cover`) e alle
regole safe area in `app/globals.css` (classe `.safe-top` sull'header).

## Primo avvio sul Mac

Prerequisiti: **Xcode** (aperto una volta, licenza accettata),
**Android Studio** (include già il JDK) con un emulatore creato dal
Device Manager, **Node 22**.

```bash
git clone https://github.com/FVG-codex/FVG-Monitor.git
cd FVG-Monitor
git checkout app-mobile
cd mobile
npm install
npx cap sync
```

### iOS

```bash
npx cap open ios
```

1. Xcode scarica da solo i pacchetti Swift (barra di stato in alto, la
   prima volta può metterci qualche minuto).
2. Target **App → Signing & Capabilities → Team**: scegli il tuo Apple ID
   (basta un account gratuito per provare su simulatore e sul tuo iPhone;
   per TestFlight e App Store serve l'Apple Developer Program).
3. Scegli un simulatore iPhone in alto e premi ▶︎.

### Android

```bash
npx cap open android
```

Attendi la fine del Gradle sync, scegli l'emulatore e premi ▶︎.

## Lavoro quotidiano

- **Modifiche al sito**: si vedono nell'app appena sono in produzione su
  Vercel (merge su `main`). Per provare un branch prima del merge, metti
  temporaneamente in `server.url` l'URL di anteprima Vercel, poi
  `npx cap sync` (le anteprime protette da login Vercel non si aprono
  nell'app: va tolta la protezione o usato un URL condiviso).
- **Modifiche a `capacitor.config.ts` o nuovi plugin**: `npx cap sync`,
  poi ricompila da Xcode / Android Studio.
- **Nuove icone**: `python3 scripts/genera-icone.py` (dalla radice del
  repo: `python3 mobile/scripts/genera-icone.py`), poi
  `npm run icone` e `npx cap sync`.

## Da fare prima degli store

- Notifiche push (allerte PC FVG, terremoti) e geolocalizzazione: le
  funzioni native che danno all'app un valore in più del sito — Apple
  rifiuta le app che sono solo un sito "impacchettato" (linea guida 4.2).
- Privacy policy pubblica sul sito e schede "dati raccolti" su App Store
  Connect e Google Play (Google Analytics compreso).
- Screenshot, descrizioni, categoria.
- Google Play, account personali nuovi: periodo di test chiuso con un
  gruppo di tester prima della pubblicazione.
