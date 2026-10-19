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

## Chi fa cosa

- **Windows (lavoro quotidiano)**: modifiche al codice, commit e push,
  build e prove dell'app **Android** (Android Studio + emulatore).
- **Mac (solo iOS)**: `git pull`, build e prove su simulatore/iPhone,
  invio a TestFlight. iOS non si compila su Windows.

Il file `.gitattributes` nella radice del repo tiene `gradlew` e gli
script shell con fine riga LF anche quando si fa commit da Windows:
senza, sul Mac non partirebbero.

## Windows — primo avvio (PowerShell, un comando alla volta)

Prerequisiti: **Git for Windows**, **Node 22**, **Android Studio**
(include già Java: non serve installarlo a parte) con un emulatore
creato da *Device Manager* (es. Pixel 8, ultima versione di Android).

```powershell
cd $HOME\Documents
```
```powershell
git clone https://github.com/FVG-codex/FVG-Monitor.git
```
```powershell
cd FVG-Monitor
```
```powershell
git checkout app-mobile
```
```powershell
cd mobile
```
```powershell
npm install
```
```powershell
npm run sync:android
```
```powershell
npm run android
```

`npm run android` apre il progetto in Android Studio: attendi la fine
del *Gradle sync* (barra in basso, la prima volta qualche minuto),
scegli l'emulatore in alto e premi ▶︎.

Se PowerShell blocca `npm` con un errore sui criteri di esecuzione
("running scripts is disabled"), una volta sola:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Nota: la cartella `Documents\FVGMonitor\fvgmonitor-source` non è
collegata a Git — d'ora in poi si lavora nel clone `Documents\FVG-Monitor`.

## Mac — iOS

Prerequisiti: **Xcode** (aperto una volta, licenza accettata),
**Node 22**. CocoaPods non serve (il progetto usa Swift Package Manager).

Prima volta:

```bash
git clone https://github.com/FVG-codex/FVG-Monitor.git
cd FVG-Monitor
git checkout app-mobile
cd mobile
npm install
npx cap sync ios
npx cap open ios
```

Le volte successive, dalla cartella `FVG-Monitor`:

```bash
git pull
cd mobile
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Attendi che scarichi i pacchetti Swift (barra di stato in alto, la
   prima volta può metterci qualche minuto).
2. Target **App → Signing & Capabilities → Team**: scegli il tuo Apple ID
   (basta un account gratuito per provare su simulatore e sul tuo iPhone;
   per TestFlight e App Store serve l'Apple Developer Program).
3. Scegli un simulatore iPhone in alto e premi ▶︎.

## Lavoro quotidiano

- **Modifiche al sito**: si vedono nell'app appena sono in produzione su
  Vercel (merge su `main`). Per provare un branch prima del merge, metti
  temporaneamente in `server.url` l'URL di anteprima Vercel, poi
  `npm run sync:android` (le anteprime protette da login Vercel non si
  aprono nell'app: va tolta la protezione o usato un URL condiviso).
- **Modifiche a `capacitor.config.ts` o nuovi plugin**: su Windows
  `npm run sync:android` e ricompila da Android Studio; sul Mac, dopo il
  `git pull`, `npx cap sync ios` e ricompila da Xcode.
- **Nuove icone** (da Windows, dalla radice del repo):

  ```powershell
  py -m pip install pillow
  ```
  ```powershell
  py mobile\scripts\genera-icone.py
  ```
  ```powershell
  cd mobile
  ```
  ```powershell
  npm run icone
  ```

  `npm run icone` rigenera le icone di **entrambe** le piattaforme
  (anche quelle iOS, sono solo file PNG): basta fare commit e push, sul
  Mac arrivano col `git pull`.

## Da fare prima degli store

- Notifiche push (allerte PC FVG, terremoti) e geolocalizzazione: le
  funzioni native che danno all'app un valore in più del sito — Apple
  rifiuta le app che sono solo un sito "impacchettato" (linea guida 4.2).
- Privacy policy pubblica sul sito e schede "dati raccolti" su App Store
  Connect e Google Play (Google Analytics compreso).
- Screenshot, descrizioni, categoria.
- Google Play, account personali nuovi: periodo di test chiuso con un
  gruppo di tester prima della pubblicazione.
