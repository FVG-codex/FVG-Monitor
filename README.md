# FVG Monitor

Sito "monitor" per il Friuli Venezia Giulia, ispirato a worldmonitor.app: meteo,
allerte, viabilità, ambiente e notizie della regione in un'unica pagina, più 4
pagine dedicate alle province (`/trieste`, `/udine`, `/gorizia`, `/pordenone`).

Stile: palette Adriatico notturno, Barlow Condensed + Newsreader + JetBrains
Mono, chip di zona A/B/C/D come elemento firma ricorrente (vedi
[mockup originale](fvg-monitor-mockup.html)).

## Setup locale

```bash
npm install
cp .env.example .env.local   # poi compila con i valori Supabase (vedi sotto)
npm run dev                  # http://localhost:3000
```

## Setup da fare una tantum (account personali)

Questi passaggi richiedono i tuoi account (GitHub/Vercel/Supabase) e non
possono essere eseguiti da qui:

1. **Repository Git** — `git init && git add . && git commit -m "..."`, poi crea
   un repository su GitHub e collegalo (`git remote add origin ...`)
2. **Supabase** — crea un progetto (**regione EU/Francoforte**), esegui
   `supabase/schema.sql` nell'SQL Editor, copia `URL` e `anon public key` in
   `.env.local`
3. **Vercel** — importa il repository, aggiungi le stesse variabili
   d'ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   nelle impostazioni del progetto — il deploy parte da solo ad ogni push
4. **Secrets GitHub Actions** (*Settings → Secrets and variables → Actions*):
   - `SUPABASE_URL` — stesso valore di `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — chiave **service_role** (Project Settings →
     API → Legacy anon, service_role API keys). **Non** la chiave anon: questa
     bypassa Row Level Security ed è l'unica autorizzata a scrivere. Non va mai
     in `.env.local` né nel codice del sito

Il workflow `.github/workflows/ingest-light.yml` gira ogni 15 minuti e popola
tutti i moduli elencati sotto. Puoi lanciarlo a mano dalla tab *Actions* →
"Ingestion leggera" → "Run workflow" per un primo popolamento immediato.

## Struttura

```
app/            pagine Next.js (App Router)
  page.tsx        homepage — vista d'insieme
  trieste/        pagina dedicata Trieste
  udine/          pagina dedicata Udine
  gorizia/        pagina dedicata Gorizia
  pordenone/      pagina dedicata Pordenone
components/     componenti riutilizzabili (un file per modulo, vedi sotto)
lib/            client Supabase + configurazione condivisa delle 4 province
supabase/       schema.sql del database
scripts/        ingest-light.mjs — tutti i job di ingestione dati
.github/        workflow di ingestione schedulata
```

## Moduli attivi

Ogni modulo ha una funzione `ingestXxx()` in `scripts/ingest-light.mjs` e un
componente React che legge da Supabase con lo stesso nome.

| Modulo | Fonte | Note |
|---|---|---|
| **Meteo** (4 province) | Bollettino OSMER ARPA FVG | Solo previsioni domani/dopodomani + osservazioni di ieri — i dati OSMER real-time non sono ripubblicabili prima di 24h |
| **Condizioni live** (4 province) | Widget ufficiale ARPA FVG | Uno per capoluogo, vedi sezione widget sotto |
| **Notizie** | RSS ANSA FVG | Solo titolo/link/data — il feed dichiara "for personal use only", da rivalutare se il progetto cresce |
| **Allerta Protezione Civile** (4 province) | Widget ufficiale PC FVG | Uno per capoluogo, vedi sezione widget sotto |
| **Bora/Vento** (4 province) | API monitoraggio PC FVG (CC BY 4.0) | Stazioni verificate: Trieste (212), Udine S+M (558), Gorizia aeroporto (65), Pordenone meteo (131) |
| **Pioggia** (4 province) | Stessa API, stesse stazioni | Sensori `P_1h` / `Prec_24_ore` |
| **Temperatura live** (4 province) | Stessa API, stesse stazioni | Sensore `T` — aggira il vincolo 24h di OSMER (fonte diversa, licenza esplicita) |
| **Livelli fiumi** (4 province) | Stessa API, stazioni idrometriche dedicate | Gorizia idro/Isonzo (66), Latisana 1 idro/Tagliamento (240), Pordenone Noncello (132), Francovez Rosandra/Trieste (602) |
| **Livello mare** | Stessa API, 3 stazioni costiere | Trieste (502), Grado (68), Lignano (77) — sensore `LIV_MARE_IGM42`, rilevante per l'acqua alta a Trieste |
| **Qualità acque di balneazione** — homepage | Dataset Socrata ARPA FVG "Acqua - Acque di Balneazione" (`fpj6-y9vk`) | `BalneazionePanel.tsx`, un tab per provincia. 66 punti di monitoraggio in tutta la regione (non solo i capoluoghi) — sia acque marino-costiere sia acque interne (laghi, fiumi). Provincia ricavata dal codice ufficiale `id_area_balneazione` (`IT006` + codice provincia ISTAT: 030 Udine, 031 Gorizia, 032 Trieste, 093 Pordenone), più affidabile del match per nome usato altrove. Per ciascun punto, esito favorevole/sfavorevole sull'ultimo prelievo confrontando enterococchi/E. coli con i valori limite per singolo campione dell'Allegato A del D.Lgs 116/2008 (soglie diverse tra acque marine e interne) — **non** è la classificazione stagionale eccellente/buona/sufficiente/scarsa (quella si basa sul 95°/90° percentile di 4 stagioni, non riproducibile da un solo prelievo). Indicativo, non sostituisce un'eventuale ordinanza comunale di divieto |
| **Qualità dell'aria** (4 province, 4 inquinanti a tab) | 4 dataset Socrata ARPA FVG: PM10 (`qp5k-6pvm`), PM2.5 (`d63p-pqpr`), Ozono (`7vnx-28uy`), NO2 (`ke9b-p6z2`) | Un unico pannello (`AriaQualitaPanel.tsx`) con tab per inquinante — dato giornaliero/orario con qualche giorno di ritardo (validazione ARPA). Match per nome città in `ubicazione` (il campo `rete` esisteva nei dati storici ma non in quelli recenti). Soglie: PM10 50 µg/m³, PM2.5 linea guida OMS 15 µg/m³ 24h (l'Italia ha solo limite annuale), Ozono 120 µg/m³ media mobile 8h, NO2 200 µg/m³ media oraria. Pordenone spesso "n.d." per l'ozono: la stazione storica è dismessa dal 2013-2014 |
| **Pollini** (tab per provincia) | Dataset Socrata ARPA FVG "Aria - Pollini" (`rnci-smsu`), rete aerobiologica POLLnet | `PolliniPanel.tsx`, un tab per provincia invece che per genere (a differenza del pannello qualità aria) — dentro ogni tab, i generi con presenza rilevata questa settimana (media > 0 granuli/m³), ordinati dal più alto. Dato **settimanale** (rilevamento continuo, pubblicazione a cadenza settimanale), non giornaliero. Stazioni attive verificate manualmente (agosto 2026): Trieste (Castello di S. Giusto), Lignano Sabbiadoro e Tolmezzo (entrambe provincia di Udine — nessuna stazione è nel capoluogo), Pordenone. **Nessuna stazione attiva in provincia di Gorizia** (Monfalcone, l'unica storica lì, ferma al 2011) — gap reale della rete regionale, il tab mostra il messaggio esplicito invece di "n.d." silenzioso. Nessuna classificazione di rischio (assente/scarsa/media/alta): ARPA la pubblica ma con soglie diverse per ciascun genere, non estratte in modo affidabile — mostriamo solo il dato grezzo, rimandando al bollettino ufficiale per l'interpretazione |
| **Sport** — hub `/sport` | — | Riquadro con icona per ciascuno sport, punto di ingresso a `/calcio`, `/basket`, `/baseball` — raggiungibile dal menu ad amburger. Ogni pagina sportiva ha un link "← Sport" per tornare all'hub |
| **Calcio** — pagina dedicata `/calcio` | gare.lnd.it (LND Comitato FVG) | App Inertia.js: la pagina incorpora l'intero stato (partite + classifica) in un tag `<script data-page="app">`, estratto con `cheerio` — niente scraping di HTML visibile. 9 campionati (Eccellenza, Promozione, Prima Categoria A/B/C, Seconda Categoria Gorizia/Pordenone/Udine-B/Udine-C — quest'ultima organizzata per provincia invece che su gironi regionali unificati) selezionabili da tab in pagina — vedi `COMPETIZIONI_CALCIO` in `ingest-light.mjs` per aggiungerne altri. **⚠️ Promemoria annuale**: gli URL hanno `stagione=2025` fisso — a inizio di ogni nuova stagione (di solito settembre) va aggiornato manualmente in `COMPETIZIONI_CALCIO`, altrimenti resta bloccato sull'ultima stagione conclusa |
| **Basket** — pagina dedicata `/basket` | fip.it/risultati (FIP) | A differenza del calcio, qui i dati sono già nell'HTML servito dal server (nessun tag JSON incorporato) — scraping diretto con `cheerio`. **Nota di fragilità aggiuntiva**: l'URL non specifica un girone/comitato esplicito come per il calcio, la pagina mostra un "default" (al momento Trieste, Serie C/Divisione Regionale 1) che potrebbe cambiare lato FIP nel tempo — se i dati smettono di tornare coerenti, verificare se serve un URL più specifico. Estendibile via `COMPETIZIONI_BASKET` in `ingest-light.mjs` |
| **Baseball & Softball** — pagina dedicata `/baseball` | live.baseballfvg.it (sito dell'utente, con 2 route API dedicate: `/api/calendario`, `/api/classifiche`) | Fetch semplice, nessuna protezione anti-bot (a differenza del tentativo iniziale con fibs.it direttamente, bloccato con HTTP 403). Le competizioni (Serie A Silver, Serie B Baseball, Serie A2 Softball) vengono scoperte dinamicamente dal calendario filtrato `fvg=true`. Squadre FVG evidenziate in ciano, classifiche raggruppate per girone |
| **Tennis** — pagina dedicata `/tennis` | API FITP (Federazione Italiana Tennis e Padel), `dp-myfit-test-function-v2.azurewebsites.net` | 6 classifiche (Maschile/Femminile × 2ª/3ª/4ª categoria) Top 10 FVG per grado di classifica — vedi nota "Tennis" sotto per i dettagli (sortcolumn server-side inaffidabile, ordinamento e deduplica fatti lato ingest) |
| **Sci** — pagina dedicata `/sci` | API FISI (Federazione Italiana Sport Invernali), `comitati.fisi.org` (WordPress admin-ajax) | Calendario gare (non classifica) FVG, sport invernali — fondo, salto, combinata nordica, biathlon, alpino ecc. — vedi nota "Sci" sotto |
| **Webcam regionali** — pagina dedicata `/webcam` | osmer.fvg.it (CC BY-SA 3.0) + turismofvg.it (Panomax/Feratel, statico) | OSMER fa da specchio/proxy delle immagini di terze parti sul proprio dominio (`data-src` relativo) — le mostriamo da un unico dominio. Ogni card è cliccabile e apre la fonte originale (`data-url`) in una nuova scheda; se l'immagine non carica, mostra "Anteprima non disponibile" (`WebcamCard.tsx`, componente condiviso con `/viabilita`). **Nota sulla provincia**: le "zone geografiche" di OSMER non coincidono sempre con i confini provinciali (es. "Costa ovest e Laguna" include sia Grado/GO sia Lignano/UD) — mappa comune→provincia il più precisa possibile (`OSMER_COMUNE_PROVINCIA`), con fallback sulla zona quando il nome non è riconosciuto. Le webcam autostradali (A4/A23/A28/SR354) sono escluse qui e vivono in `/viabilita`. I panorami 360° di turismofvg.it (Panomax/Feratel) sono hardcoded in `WebcamPage.tsx` (elenco statico, non cambia spesso) — embeddati come iframe, non scrapati. **Non verificato**: se l'API monitor.protezionecivile.fvg.it abbia un endpoint webcam (non sembra dall'elenco sensori già esplorato, ma non controllato esplicitamente) |
| **Meteo** — pagina dedicata `/meteo` | Riusa componenti già esistenti (nessuna nuova ingestione) | Consolida bollettino OSMER + temperatura live + widget ARPA + vento + pioggia + radar, organizzati per provincia (o "Tutta la regione"). Raggiungibile dal menu ad amburger, in cima |
| **Radar meteo** | API monitoraggio PC FVG, gruppo `radar` | Solo il radar di Fossalon (id 1) è attivo — Lussari e Mosaico risultano spenti (`status: "X"`). 4 prodotti selezionabili da tab, ciascuno con una breve spiegazione in pagina: `SRTLBM_1` (pioggia, mm), `SSI` (severità temporale), `HMC` (classificazione idrometeore — pioggia/neve/grandine), `LBM_V` (velocità Doppler, m/s) — tutti recuperati in un'unica chiamata (`/radars/1/products` restituisce già tutti i prodotti disponibili insieme). Le immagini sono **trasparenti fuori dalle zone colorate** (nessuna base geografica) — sovrapposte a una vera mappa (Leaflet + tile OpenStreetMap) usando l'`extent` fornito dall'API stessa (`RadarMeteoMap.tsx`, caricato dinamicamente lato client — Leaflet richiede il DOM del browser) |
| **Terremoti** — pagina dedicata `/terremoti` | INGV (FDSN Event Web Service, standard internazionale, gratuito) | L'API PC FVG ha uno schema dati "Earthquake" predisposto ma **nessun endpoint GET pubblicato** per interrogarlo — usiamo quindi la fonte ufficiale italiana per la sismologia. Filtrato per area geografica FVG (bounding box), ultimi 30 giorni. Mappa Leaflet con marker colorati per magnitudo (`TerremotiMap.tsx`) + elenco cronologico |
| **Viabilità** — pagina dedicata `/viabilita` (nel menù ad amburger) + pannello homepage | InfoViaggiando (eventi, feed WFS non dichiarato pubblico — stessa cautela di ANSA) + OSMER (webcam A4/A23/A28/SR354) | La pagina dedicata combina il pannello eventi (`ViabilitaPanel`, stesso dato del pannello homepage), il prezzo carburanti e le webcam autostradali filtrate dallo stesso snapshot `webcam:osmer` usato da `/webcam` |
| **Trasporti** — pagina dedicata `/trasporti` (nel menù ad amburger) | Trieste Airport (voli) + ViaggiaTreno (treni, vedi nota "Ferrovie" sotto) + TPL FVG (autobus, vedi nota "Autobus" sotto) | Pagina distinta da Viabilità (quella resta sul traffico stradale). Contiene il pannello voli (stesso `VoliPanel`/dato `voli:trieste-airport` della homepage), il pannello treni (`TreniPanel.tsx`, fetch lato client verso una Route Handler nostra che interroga ViaggiaTreno lato server) e il pannello autobus (`AutobusPanel.tsx`, fetch **diretto dal browser** verso TPL FVG, niente proxy — vedi nota "Autobus" per il perché) |
| **Prezzo carburanti** (benzina, gasolio, GPL) — homepage + pagina `/viabilita` | CSV ufficiale MIMIT (`MediaRegionaleStradale.csv`, pubblicato ogni mattina alle 8:00) | `CarburantiPanel.tsx`, un solo valore per l'intera regione per ciascun carburante (non per provincia — è così che il ministero lo pubblica, il dato regionale FVG non è scorporato per provincia). Benzina e gasolio self-service, GPL servito (unica modalità rilevante in Italia per ciascuno) — snapshot unico `carburanti` (`{ carburanti: { benzina, gasolio, gpl } }`). Il CSV include anche il metano (servito), non ingerito perché non richiesto — estendibile in futuro aggiungendo una voce a `CARBURANTI_TIPI`. Formato CSV non standard (riga "Aggiornamento" prima dell'intestazione, `;` come separatore) — parsing manuale in `ingest-light.mjs`, nessuna libreria CSV necessaria |
| **Eventi** | Scraping HTML turismofvg.it | Pagina server-rendered, no browser headless — fragile per natura (classi CSS specifiche) |
| **TGR** | — | Nessun feed trovato, link statico alla sezione ufficiale |
| **Trieste Airport** | Scraping HTML triesteairport.it | Stesso approccio degli Eventi, stessa fragilità |
| **Registro modifiche** — pagina dedicata `/changelog`, link nel footer di ogni pagina | Dati statici, `lib/changelog.ts` | Cronologia di ciò che è cambiato sul sito, più recente in cima — vedi nota "Registro modifiche" sotto per il promemoria di aggiornamento |

**Abbandonato**: trasporto pubblico TPL FVG — nessun endpoint pubblico per il
tracciamento GPS trovato (verificato via devtools/WebSocket), solo l'elenco
statico delle fermate, ritenuto di scarso interesse.

## Widget ufficiali ARPA e Protezione Civile

Il sito è organizzato per provincia, quindi entrambi i widget richiedono
**4 richieste separate**, una per capoluogo (Trieste, Udine, Gorizia,
Pordenone):

- **Meteo**: [widget.meteo.fvg.it](https://widget.meteo.fvg.it) → 4 URL di
  script ricevuti via email → incollali in `components/MeteoWidgetSlot.tsx`
  (`WIDGET_URL_PER_CITTA`). Usano `document.write()`, quindi girano dentro un
  `<iframe>` isolato (`ArpaWidgetEmbed.tsx`) — nessuna azione extra richiesta.
- **Allerte**: [protezionecivile.fvg.it/it/widget-allerta](https://www.protezionecivile.fvg.it/it/widget-allerta)
  → 4 snippet ricevuti → incollali in `components/AllertaWidgetSlot.tsx`
  (`SNIPPET_PER_CITTA`, tra backtick). Se lo snippet è uno `<script src="...">`
  che usa `document.write()`, va isolato come sopra invece di `HtmlEmbed`.

## Resilienza di rete

Tutte le chiamate `fetch` dello script passano da `fetchConRetry()` (3
tentativi, con breve pausa crescente tra uno e l'altro) — le fonti esterne
hanno occasionalmente timeout transitori (`ETIMEDOUT`), e senza retry un
singolo timeout fa fallire l'intero job anche se gli altri moduli sono
andati a buon fine.

L'esecuzione risulta "rossa" su GitHub Actions solo se **tutti** i moduli
falliscono (segno di un problema comune e serio, es. credenziali Supabase
rotte) — non più per il fallimento persistente di un singolo modulo (es.
un blocco di rete specifico verso una fonte, come capitato con
`pianiemergenza.protezionecivile.fvg.it` da GitHub Actions). Ogni job
fallito viene comunque loggato per nome, per capire subito cosa non ha
funzionato in una singola esecuzione.

## Fix — Allerte mai realmente collegate, poi spostate lato client (fatto)

Scoperto che il banner allerta in homepage e il pannello "Allerte · Zone"
erano rimasti **dati statici scritti a mano** fin dallo scaffold iniziale
(mai collegati a una fonte reale). Trovato l'endpoint reale dietro il
widget ufficiale (`pianiemergenza.protezionecivile.fvg.it/api/alerts.jsonp`,
formato JSONP) — ma si è rivelato **bloccato in modo persistente per le
richieste da GitHub Actions** (timeout di connessione TCP puro, confermato
su più tentativi anche a sito raggiungibile normalmente da browser).

**Soluzione finale**: spostato interamente lato client (`lib/jsonp.ts` +
`lib/allerte.ts`) — i componenti React (`AlertBannerLive`,
`AllertaZonePanel`, `ZonaAllertamentoLive`) interrogano l'endpoint JSONP
**direttamente dal browser** di chi visita il sito, esattamente come fa
già il widget ufficiale — bypassa il blocco perché usa l'indirizzo IP del
visitatore, non quello di GitHub Actions. Nessun dato passa più da
Supabase per questo modulo.

**Scoperta importante**: l'API restituisce la zona di allertamento reale
per comune (via istatcode), e non sempre coincide con la mappa statica
provincia→zona in `lib/province.ts` (es. Trieste risultata zona D per
un'allerta, non C come assunto lì). La zona è disponibile **solo quando
c'è un'allerta attiva** — senza allerte attive, i chip di zona mostrano
"—" invece di indovinare una lettera potenzialmente sbagliata.

## Note di fragilità

I moduli **Eventi** e **Trieste Airport** fanno scraping HTML (non un'API
dichiarata) — dipendono da classi CSS specifiche ispezionate manualmente via
devtools. Se i siti sorgente cambiano veste grafica, i rispettivi
`ingestXxx()` in `scripts/ingest-light.mjs` andranno aggiornati ripetendo lo
stesso procedimento di ispezione.

## Ferrovie — dentro `/trasporti`

Dati treni in tempo reale (partenze/arrivi) per un elenco di stazioni della
regione, dentro la pagina `/trasporti` (distinta da `/viabilita`, che resta
sul traffico stradale). Fonte: **ViaggiaTreno** (Trenitalia/RFI), API REST
non ufficiale/non documentata pubblicamente — stessa cautela già usata per
InfoViaggiando e ANSA in questo progetto.

Il sito ha un frontend nuovo (SPA) dal 2026: il vecchio percorso API
`viaggiatrenonew/resteasy/...` citato in guide di terze parti (spesso datate
2015-2020) **non funziona più** — reindirizza a una pagina "nuovo sito
disponibile qui". L'API è però ancora viva sotto un percorso diverso,
verificato manualmente in questa sessione (agosto 2026):

- Base: `https://www.viaggiatreno.it/infomobilitamobile/resteasy/viaggiatreno/`
  — HTTPS, non HTTP (vedi cronologia bug sotto).
- Ricerca stazione: `autocompletaStazione/{testo}` → testo semplice
  `NOME|CODICE` (es. `TRIESTE CENTRALE|S03317`)
- Partenze: `partenze/{codiceStazione}/{orario}` — `{orario}` nel formato
  `Sat Aug 22 2026 22:18:00 GMT+0200` (stile `Date.toString()` di
  JavaScript), risponde con un array JSON (numeroTreno, categoria,
  destinazione, orarioPartenza, ritardo, binarioEffettivo/Programmato,
  stato, circolante, nonPartito, arrivato — testato con dati reali)
- Arrivi: stessa struttura su `arrivi/{codiceStazione}/{orario}`

Stazioni attive (elenco piatto in `STAZIONI_TRENI`, non più legato 1:1 alle
4 province — vedi sotto): Trieste Centrale `S03317`, Udine `S03026`,
Gorizia Centrale `S03304`, Pordenone `S02701`, Monfalcone `S03310`,
Trieste Airport `S03213`, Tarvisio Boscoverde `S03015`. Altre stazioni
verranno aggiunte in futuro su richiesta — codici sempre verificati
manualmente con `autocompletaStazione/{testo}` prima di aggiungerle.

**Cronologia bug "dati treni mai raccolti" (agosto 2026):**

1. Prima versione di `lib/treni.ts` chiamava l'API direttamente dal browser
   (fetch lato client, come le allerte) usando `http://` come base. In
   produzione (Vercel forza HTTPS) il browser blocca in silenzio le
   richieste "mixed content" verso un endpoint `http://` da una pagina
   `https://` — nessun errore visibile, il modulo restava fermo su "dati
   non disponibili". **Fix 1**: cambiata la base in `https://`.
2. L'utente ha confermato via screenshot che il problema persisteva
   identico anche dopo il fix HTTPS (voli OK, treni sempre "dati non
   disponibili", sia sera che mattina dopo). Causa più probabile: l'API di
   ViaggiaTreno non è pensata per essere chiamata da domini terzi e non
   manda header CORS (`Access-Control-Allow-Origin`) — il browser scarta
   quindi la risposta a qualunque fetch cross-origin verso quell'host,
   anche quando la richiesta di rete va a buon fine lato server. L'errore
   che ne risulta lato JavaScript è generico ("Failed to fetch"),
   indistinguibile nel nostro `catch` da qualunque altro fallimento —
   stesso identico sintomo del bug HTTP/HTTPS precedente. **Fix 2**
   (architetturale, sostituisce il fetch diretto): il fetch verso
   ViaggiaTreno ora avviene **server-side**, dentro una Route Handler
   Next.js (`app/api/treni/[tipo]/[stazione]/route.ts`), che non è mai
   soggetta a CORS (restrizione che esiste solo per richieste fatte da un
   browser). `lib/treni.ts`, lato client, chiama solo questa route sul
   nostro stesso dominio (`/api/treni/...`, same-origin, nessun CORS
   possibile) e la route interroga ViaggiaTreno lato server, normalizza i
   dati e li restituisce già pronti. Confermato dall'utente: dopo questo
   fix i dati arrivano regolarmente (voli e treni entrambi popolati).
3. Con i dati finalmente in arrivo, l'utente ha segnalato un problema di
   visualizzazione: treni non ancora partiti (es. partenza schedulata più
   tardi nella mattinata) venivano mostrati come **"Cancellato"** invece
   che "Non ancora partito" — confermato con screenshot a confronto col
   widget ufficiale ViaggiaTreno, che per quegli stessi treni mostra
   correttamente "non partito". Causa: la logica in `normalizzaRiga()`
   usava `circolante === false` come indicatore di cancellazione, ma dai
   dati reali (verificati con una nuova chiamata all'API) risulta che
   `circolante` è `false` per **qualunque** treno non ancora partito
   (diventa `true` solo dopo la partenza effettiva) — non è affatto un
   indicatore di soppressione, nonostante il nome suggerisca il contrario.
   **Fix 3**: sostituito con `provvedimento` (0 regolare, 1 treno
   cancellato, 2 treno parzialmente cancellato/deviato/riprogrammato —
   valori dedotti da documentazione di terze parti sull'API, dato che
   ViaggiaTreno non pubblica una spec ufficiale), aggiunto un nuovo stato
   intermedio `"modificato"` per il caso 2 (distinto da una cancellazione
   piena), e il testo mostrato ora usa **il testo ufficiale di
   ViaggiaTreno stesso** (`compRitardo[0]`, lo stesso testo del loro
   widget, es. "non partito", "ritardo 1 min.") invece di una frase
   ricostruita a mano, per restare sempre coerente con la fonte.

Nota tecnica sulla Route Handler: gira su funzioni serverless che su Vercel
girano in fuso orario UTC, non Europe/Rome — se il parametro `{orario}`
fosse calcolato con `Date.prototype.getHours()` (che usa il fuso del
processo) risulterebbe sbagliato di 1-2 ore rispetto all'Italia. Per questo
`formattaOrarioRichiesta()` nella route usa esplicitamente
`Intl.DateTimeFormat` con `timeZone: "Europe/Rome"` per calcolare sia l'ora
locale italiana sia il relativo offset UTC (gestendo CET/CEST
automaticamente), indipendentemente dal fuso orario del server — verificato
con `TZ=UTC node -e ...` che produce l'offset corretto sia in agosto
(`GMT+0200`) che in gennaio (`GMT+0100`).

Non verificato (perché non riproducibile da questa sessione senza un
browser reale in un ambiente di produzione): se l'endpoint ViaggiaTreno
blocchi anche IP di datacenter/cloud in generale — non dovrebbe più
rilevare visto che ora il fetch verso ViaggiaTreno parte dal server Vercel
e non più dal browser del visitatore, ma è un'ipotesi da tenere presente se
il problema dovesse ripresentarsi anche col proxy.

## Autobus — dentro `/trasporti`

Passaggi (arrivi e partenze insieme, a differenza dei treni) in tempo
reale per le fermate degli autobus, dentro `/trasporti` accanto a Voli e
Treni. Fonte: **TPL FVG** (myCicero), API REST non ufficiale/non
documentata pubblicamente — stessa cautela già usata per ViaggiaTreno.

A differenza di ViaggiaTreno, questa sessione non è mai riuscita a
raggiungere l'endpoint reale da sola: né WebFetch (vede solo l'HTML
statico iniziale della pagina di ricerca fermate su tplfvg.it — i dati
arrivano via chiamate JS che non può osservare) né un tentativo diretto
sul sottodominio `realtime.tplfvg.it` (irraggiungibile anche solo per il
suo `robots.txt`, verificato più volte — coerente col blocco IP di
datacenter/cloud poi confermato per il bug sotto: questo stesso sandbox
è quasi certamente un altro IP di quel tipo). L'endpoint è stato scoperto
dall'utente stesso, ispezionando la scheda Rete/Network del proprio
browser mentre usava `https://tplfvg.it/it/orari/mappa/` e poi
`https://realtime.tplfvg.it/?stopcode=...` (il sottodominio dedicato al
tempo reale, linkato da un bottone "Realtime" nei risultati di ricerca
fermata):

- Base: `https://realtime.tplfvg.it/API/v1.0/polemonitor`
- Passaggi (arrivi + partenze insieme): `mrcruns?StopCode={codice}&IsUrban=true`
  — risponde con un array JSON (`Line`, `TransitType` — `"ArrivalAtStop"` o
  `"DepartureFromStop"`, distingue arrivo/partenza — `Destination`,
  `Departure`, `ArrivalTime` già in formato `HH:MM`, `Race`, `Direction`,
  `Platform`, `IsStarted`, `Latitude`/`Longitude` — testato con dati reali)
- Anagrafica fermata: `info?StopCode={codice}` — risponde con `Address`,
  coordinate, `IsUrban`/`IsExtraUrban`/`IsMaritime`/`IsStation`

**Nota su `IsUrban`**: per la fermata di verifica (`TS608`, "TRIESTE
piazza della Libertà (autostazione)"), `/info` la classifica
`IsUrban:false` / `IsExtraUrban:true` — eppure la richiesta reale del
sito ufficiale a `/mrcruns` usa comunque `IsUrban=true` e riceve
regolarmente corse extraurbane (Grado, Aeroporto). Il parametro non
sembra quindi filtrare i risultati in base alla classificazione della
fermata; per ora `IsUrban=true` è tenuto costante nella Route Handler,
l'unico valore verificato con dati reali — da rivedere se una fermata
futura restituisse un array sospettosamente vuoto.

**Confermato dall'utente in produzione** (screenshot: pannello popolato
con corse reali, G51R per Aeroporto e G51A da Aeroporto).

**Blocchi (aggiornamento 23/08/2026)**: TPL FVG usa più codici fermata
distinti per pensiline/binari diversi che sono fisicamente lo stesso
posto — l'utente ha chiesto di unire più fermate vicine in un'unica
vista invece di una tab per codice. `BLOCCHI_AUTOBUS` in `lib/autobus.ts`
sostituisce il vecchio `FERMATE_AUTOBUS`: ogni blocco ha uno slug/nome
(diventa una tab nel pannello) e un elenco di fermate (`stopCode` +
`nome`). `fetchPassaggiBlocco()` interroga tutte le fermate del blocco
in parallelo (`Promise.allSettled`, non `Promise.all`: se una singola
fermata ha un problema momentaneo le altre restano visibili — errore
solo se **nessuna** fermata del blocco risponde), unisce i risultati e
li ordina cronologicamente per orario di transito reale (campo `Time`
dell'API, timestamp ISO completo — più preciso di `ArrivalTime`, che è
solo `HH:MM`). Ogni passaggio mostra anche la fermata fisica di origine
(`fermataNome` + `fermataCodice`), necessario perché più fermate di uno
stesso blocco possono condividere lo stesso indirizzo pubblicato.

Primo blocco: **Trieste**, 11 fermate intorno alla Stazione
Ferroviaria/Piazza della Libertà — indirizzi e coordinate verificati
dall'utente con una chiamata reale a `info?StopCode=...` per ciascuna
(vedi tabella sotto). 9 delle 11 condividono l'indirizzo "STAZIONE
FERROVIARIA" (pensiline diverse nello stesso piazzale, l'API non li
distingue oltre al codice); `32206` non ha un indirizzo pubblicato
dall'API ma le coordinate lo collocano a poche decine di metri dalle
altre, quindi resta nel blocco mostrato col solo codice.

| Codice | Nome mostrato | Indirizzo API | isUrban / isExtraUrban |
| --- | --- | --- | --- |
| `04007` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04011` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04022` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `32206` | *(nessuno — indirizzo non pubblicato)* | *(vuoto)* | true / true |
| `04016` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04018` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04019` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04023` | Stazione Ferroviaria (varco Porto Vecchio) | stazione ferroviaria (varco porto Vecchio) | true / false |
| `TS608` | Piazza della Libertà (autostazione) | TRIESTE piazza della Libertà (autostazione) | false / true |
| `04015` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |
| `04014` | Stazione Ferroviaria | STAZIONE FERROVIARIA | true / false |

**Altre province, aggiunte il 23/08/2026** con lo stesso metodo (script
dalla console del browser, `info` + `mrcruns` per ogni codice, nessun
dato "a naso"):

| Blocco | Codice | Nome mostrato | Indirizzo API | isUrban / isExtraUrban |
| --- | --- | --- | --- | --- |
| Udine | `70101` | Viale Europa Unita (autostazione) | UDINE viale Europa Unita 37 (autostazione) | false / true |
| Udine | `UD237` | Viale Europa Unita (lato Stazione FS) | UDINE viale Europa Unita 54 (lato stazione FS) | true / false |
| Udine | `70C37` | Viale Europa Unita (fronte Stazione FS) | UDINE viale Europa Unita 99 (fronte stazione FS) | true / false |
| Gorizia | `CIPN0` | Centro Intermodale Passeggeri | GORIZIA Centro Intermodale Passeggeri | false / true |
| Gorizia | `CIPN1` | Centro Intermodale Passeggeri (corsia 1) | GORIZIA Centro Intermodale Passeggeri (corsia 1) | true / true |
| Gorizia | `CIPN4` | Centro Intermodale Passeggeri (corsia 4) | GORIZIA Centro Intermodale Passeggeri (corsia 4) | true / true |
| Gorizia | `CIPN5` | Centro Intermodale Passeggeri (corsia 5) | GORIZIA Centro Intermodale Passeggeri (corsia 5) | true / true |
| Pordenone | `P3322` | Stazione Ferroviaria | PORDENONE Stazione Ferroviaria | false / true |
| Pordenone | `UP129` | Stazione Ferroviaria | PORDENONE Stazione Ferroviaria | true / false |
| Trieste Airport | `G1650` | Aeroporto Trieste Airport | AEROPORTO Trieste Airport | false / true |
| Monfalcone | `M2033` | Stazione Ferroviaria | MONFALCONE stazione ferroviaria | true / true |
| Monfalcone | `M2019` | Stazione Ferroviaria (lato entrata) | MONFALCONE stazione ferroviaria (lato entrata) | true / true |

Nota: alcuni codici (es. `M2019`, `04022`, `32206`, `04016`, `04019`)
hanno restituito 0 corse nel momento del test — verificato che sia un
array vuoto valido, non un errore, quindi probabilmente solo un
momento senza passaggi programmati su quella pensilina specifica; da
tenere d'occhio se dovesse restare sempre vuoto.

Altri blocchi/fermate verranno aggiunti in futuro su richiesta esplicita
dell'utente, stesso metodo di verifica.

**Scelta architetturale, AGGIORNATA dopo il bug sotto**: fetch
**direttamente dal browser** del visitatore, non un proxy server-side.
Partito diversamente (proxy `app/api/autobus/[stopCode]/route.ts` fin
dall'inizio, applicando la lezione di Ferrovie su mixed-content/CORS),
ma quel proxy si è rivelato lui stesso bloccato lato server per un
motivo diverso (vedi "Bug 1" sotto) — rimosso. `lib/autobus.ts` ora
chiama direttamente `https://realtime.tplfvg.it/...` dal browser
dell'utente finale.

**Bug 1 (dati mai disponibili, nonostante il proxy)**: l'utente ha
testato subito dopo la prima consegna — identico sintomo dei bug 1/2 di
Ferrovie ("Dati autobus non disponibili al momento"). Causa non ancora
confermata con certezza (questa sessione non riesce a raggiungere
`realtime.tplfvg.it` in nessun modo, nemmeno per leggerne il
`robots.txt` — fallimento di rete/timeout, non un errore HTTP, vedi sopra
— quindi non è possibile riprodurre il problema da qui). Prima ipotesi:
una protezione anti-bot (WAF/CDN) che blocca richieste senza intestazioni
"da browser vero". **Fix tentativo 1**: aggiunte intestazioni
`User-Agent`/`Accept`/`Referer` da browser alla richiesta server-side —
**confermato dall'utente che NON ha risolto** ("ancora una volta stesso
problema"). Aggiunto anche un campo `dettaglio` nella risposta JSON di
errore della route (non visibile nell'interfaccia, solo visitando
direttamente `/api/autobus/TS608` nel browser) con il messaggio reale
dell'errore — non ancora usato, in attesa che l'utente lo visiti e mandi
il contenuto.

Con l'ipotesi 1 smentita, l'utente ha visitato `/api/autobus/TS608`
direttamente: `dettaglio` conteneva `"TypeError: fetch failed"` — errore
generico di Node/undici per un fallimento di rete a basso livello.
**Fix tentativo 2**: `vercel.json` con `"regions": ["fra1"]`
(Francoforte, EU) al posto del default USA. Deployato, **smentito
anche questo**: dopo il redeploy `dettaglio` mostra ora
`"TypeError: fetch failed | cause: ConnectTimeoutError: Connect Timeout
Error (attempted address: realtime.tplfvg.it:443, timeout: 10000ms)"` —
stesso identico fallimento (timeout in fase di connessione TCP/TLS,
prima ancora di mandare l'HTTP request) da una regione USA E da una
regione EU. Questo esclude un semplice blocco per paese/continente.

**Ipotesi 3, CONFERMATA**: non è la geografia, ma la natura dell'IP. Un
pattern comune per le protezioni anti-scraping (Cloudflare e simili
offrono un'opzione dedicata) è bloccare a monte tutto il traffico
proveniente da intervalli IP noti di datacenter/cloud (AWS, GCP, Azure,
Vercel...) indipendentemente dal paese, lasciando passare solo IP
residenziali/mobili — e spesso lo fanno scartando silenziosamente la
connessione (da cui il timeout in fase di connect osservato nei fix 1 e
2, non un 403 applicativo) invece di rispondere con un errore HTTP.
Verificato chiedendo all'utente di lanciare, dalla console del browser
sul sito fvgmonitor stesso, un fetch diretto e cross-origin verso
`realtime.tplfvg.it`: **ha funzionato subito**, dati reali ricevuti,
nessun errore CORS (quindi l'endpoint accetta richieste cross-origin dal
browser — non lo si sapeva finché non è stato testato). Confermato anche
che cambiare regione Vercel (fix 2) non serviva a nulla per questo
motivo: qualunque IP di un provider cloud, USA o EU, viene trattato
uguale.

**Fix 3 (applicato, CONFERMATO risolto dall'utente)**: rimosso il proxy
server-side (`app/api/autobus/[stopCode]/route.ts`, cancellato) e la
normalizzazione dei dati grezzi spostata in `lib/autobus.ts`, che ora
chiama `https://realtime.tplfvg.it/API/v1.0/polemonitor/mrcruns?...`
**direttamente dal browser del visitatore** — bypassa il blocco alla
radice perché l'IP è quello del visitatore, non di un server. Eccezione
motivata e documentata al pattern standard "sempre proxy server-side"
(che resta valido per Ferrovie, dove funziona). Screenshot dell'utente:
pannello Autobus popolato con corse reali (G51R/G51A per/da Aeroporto).

## Tennis — dentro `/tennis` (25/08/2026)

Idea iniziale dell'utente: prendere i dati dal ranking FITP
(fitp.it/Campionati-tornei-e-classifiche/Classifiche/Ricerca-Giocatore).
La pagina ufficiale è una SPA Angular — l'HTML statico mostra solo
placeholder di template (`{{ giocatore.c }}`) non renderizzati, stesso
ostacolo incontrato con il tentativo di Nuoto (vedi "Idee future" sotto).
A differenza del Nuoto, qui l'utente ha trovato e condiviso (via DevTools
→ Network → Fetch/XHR → "Copia come cURL") la vera richiesta API dietro
la pagina, sbloccando l'integrazione.

**Endpoint**: `POST https://dp-myfit-test-function-v2.azurewebsites.net/api/v1/tesserati/list`
(Azure Function), `Content-Type: application/json`. Corpo:
`{ id_disciplina, id_provincia, id_regione, id_gruppo_rank,
id_categoria_rank, id_categoria_eta, sesso, freetext, rowstoskip,
fetchrows, sortcolumn, sortorder }`. `id_regione: 6` = Friuli-Venezia
Giulia, `id_disciplina: 4332` = Tennis (entrambi confermati
sperimentalmente confrontando i conteggi restituiti). Risposta:
`{ giocatori: [...], record: <totale> }`.

Gli header `Origin`/`Referer` presenti nella richiesta del browser
dell'utente sono enforcement lato browser (CORS) — dato che l'ingestione
gira lato server (Node `fetch()` in GitHub Actions, non un browser),
non serve replicarli e non sono infatti stati inclusi.

**Verifiche fatte prima di implementare** (script di test con richieste
reali, non assunzioni):

- `sesso` (`"M"`/`"F"`) è un filtro server-side affidabile: M=2691 +
  F=757 = 3448, combacia esattamente col totale non filtrato.
- `sortcolumn` **non è affidabile** per ordinare per classifica. Testati
  `"gr"`, `"grado"`, `"classifica_ranking"`: nessuno produce un ordine
  corretto — con `"grado"`/`"classifica_ranking"` il primo risultato
  aveva `gr: "4.NC"` (una delle classifiche peggiori possibili), e i due
  nomi colonna davano risultati identici tra loro, segno che vengono
  ignorati lato server con fallback a un ordine arbitrario.
- Il parametro `id_categoria_eta` (presumibile filtro server-side per
  "categoria età": Assoluti/Over 40/Under 16/ecc.) non è stato scoperto
  — nessun valore noto per "Assoluti". Aggirato filtrando lato client sul
  campo restituito `ce`: si ipotizza (in base a tutti gli esempi
  osservati, mai smentita, ma **non confermata da un'etichetta esplicita
  dell'API**) che `ce === "NOR"` = Assoluti maschile e `ce === "NOF"` =
  Assoluti femminile.

**Soluzione adottata** (`ingestTennis()` in `scripts/ingest-light.mjs`):
niente ordinamento server-side. Si pagina l'intero elenco per genere
(`fetchrows: 500`), si filtra lato client per `ce === "NOR"` / `"NOF"`,
poi si ordina con un semplice confronto **alfabetico ascendente** sulla
stringa `gr` (formato sempre `<cifra>.<cifra o NC>`, es. `"2.4"`,
`"4.NC"` — 1 è la categoria migliore, "NC" = non classificato, peggio
di qualsiasi cifra). Un confronto stringa produce da solo l'ordine
corretto perché il carattere `N` ha valore ASCII maggiore di qualsiasi
cifra — non serve interpretare la gerarchia delle classifiche italiane.
Verificato su tutti i valori `gr` osservati nei campioni reali (tutti
nel formato atteso).

**Se in futuro l'ipotesi NOR/NOF risultasse sbagliata** (es. classifiche
vuote o palesemente incoerenti), va rivista in `ingestGenereTennis()` —
non c'è modo di confermarla dall'API senza un'etichetta esplicita che
al momento non è stata trovata.

**Bug — giocatori duplicati (25/08/2026, corretto)**: la prima versione
consegnata mostrava lo stesso giocatore ripetuto più volte (stessi
nome/cognome/comune/grado/V-P), segnalato dall'utente con uno screenshot
di produzione. Non è stato possibile riprodurre/diagnosticare la causa
esatta da questa sessione: l'host dell'API (`dp-myfit-test-function-v2.
azurewebsites.net`) non è nella allowlist di rete di questo sandbox —
anche un fetch Node diretto (non tramite WebFetch) fallisce con
`403 Host not in allowlist`, un blocco della rete di questo ambiente,
non dell'API stessa. Cause plausibili non escluse a vicenda: (a) l'API
non rispetta `rowstoskip` in modo affidabile e restituisce pagine
sovrapposte; (b) con `id_gruppo_rank`/`id_categoria_rank` a `null`
l'API restituisce più righe per la stessa persona (es. una per gruppo
di ranking). **Fix robusto indipendentemente dalla causa esatta**:
deduplicazione per `nome+cognome+comune` (`dedupeGiocatoriTennis`) dopo
il filtro `ce`, prima di ordinare; rimossa anche la condizione di stop
`giocatori.length < fetchrows` nella paginazione (poteva fermarsi troppo
presto se l'API limita silenziosamente la dimensione di pagina), sostituita
da un contatore di sicurezza anti-loop-infinito (`TENNIS_MAX_PAGINE`).
**Non ancora riconfermato dall'utente in produzione dopo il fix.**

**Richiesta aggiuntiva dell'utente**: dividere le classifiche per
categoria di grado (2ª/3ª/4ª), non solo per genere, invece di un'unica
lista "assoluta" dominata dai pochi giocatori di 1ª/2ª categoria.
Implementato derivando la categoria dalla cifra prima del punto in `gr`
(`categoriaDiGrado()`) — sempre presente nel formato osservato, nessun
bisogno di un parametro API dedicato. Risultato: 6 classifiche
(Maschile/Femminile × 2ª/3ª/4ª categoria), 10 giocatori ciascuna.

Pagina `/tennis` (`TennisPage.tsx`) mostra un tab per ciascuna delle 6
classifiche e un'unica tabella (posizione, giocatore, comune, grado,
V-P), sullo stesso modello visivo di Calcio/Basket/Baseball ma con un
solo pannello invece di calendario+classifica (il tennis non ha un
"calendario partite" nello stesso senso). Card aggiunta all'hub
`/sport`.

## Sci — dentro `/sci` (25/08/2026)

Richiesta dell'utente: aggiungere lo sci alla sezione Sport, fonte
`https://comitati.fisi.org/friuli-venezia-giulia/calendario/?d=`
(calendario gare del Comitato FVG della FISI — Federazione Italiana
Sport Invernali). Come per Nuoto e Tennis, la pagina è JS/AJAX-dipendente
(WebFetch vede solo il template vuoto, "Nessuna gara trovata" + bottone
"Carica di più"); niente endpoint REST dedicato trovato su `/wp-json/`
(solo le route standard di WordPress). Sbloccato di nuovo con l'aiuto
dell'utente via DevTools → Network → "Copia come cURL".

**Endpoint**: `GET https://comitati.fisi.org/wp-admin/admin-ajax.php
?action=competizioni_get_all&offset=&limit=&url=&idStagione=&dataInizio=
&dataFine=` — un'azione AJAX custom di WordPress, non una vera REST
API. Risposta: array di gare `{ disciplina, dataInizio, comune,
provincia, nazione, nome, formato, livello, status, idCompetizione,
logo_url }`. **A differenza di Calcio/Basket/Baseball/Tennis, questo è
un calendario di gare singole, non una classifica di campionato** —
stesso tipo di modello dati mai implementato per il Nuoto (nessun
"campionato" nello sci più di quanto ce ne sia nel nuoto), ma qui la
fonte è stata effettivamente sbloccata e non c'è motivo di ripensare il
modello: mostriamo il calendario così com'è.

**Particolarità/limiti scoperti da UNA sola risposta reale** (non da
uno script di test sistematico come per calcio/tennis — l'host
`comitati.fisi.org` risulta anch'esso bloccato dalla allowlist di rete
di questo sandbox, stesso limite già incontrato con l'host Tennis, non
verificabile da qui con un fetch diretto):

1. Il filtro regionale (FVG) passa per il parametro `url` (deve
   corrispondere alla pagina calendario del comitato), non per un id
   numerico come nel Tennis — comodo, un solo valore fisso da usare.
2. `idStagione`/`dataInizio`/`dataFine`: la richiesta reale catturata
   aveva `idStagione=2026` con `dataInizio=01/06/2026` e
   `dataFine=30/05/2027` — dedotto che la "stagione sciistica" va da
   giugno a maggio dell'anno successivo, etichettata con l'anno di
   inizio (convenzione tipica sport invernali, non documentata da
   FISI). **Calcolata dinamicamente** ad ogni esecuzione
   (`stagioneScisticaCorrente()` in `ingest-light.mjs`) invece di
   scritta a mano come `COMPETIZIONI_CALCIO` — qui non serve nessun
   promemoria annuale da aggiornare manualmente.
3. Il campione catturato (fine agosto) aveva solo 4 gare, tutte estive
   (skiroll, allenamenti estivi) — la stagione invernale vera
   (dicembre-marzo) non è ancora popolata nel calendario a questa data.
   Non un bug: il calendario si riempie progressivamente durante la
   stagione. Atteso che la lista cresca molto da qui a dicembre.
4. Solo lo status `"In Calendario"` osservato nella risposta API — e
   (confermato dall'utente in produzione, 25/08/2026) **resta
   `"In Calendario"` anche per gare con data già passata**: il campo
   non è affidabile per sapere se una gara si è svolta. Non più usato
   per questo — vedi "Risultati gare passate" più sotto.
5. Paginazione non testata con più di una pagina reale (il campione
   aveva 4 risultati, meno del `limit=10` richiesto). Per la stessa
   ragione del bug duplicati sul Tennis (vedi sopra), applicata da
   subito la stessa cautela: la paginazione si ferma solo su pagina
   vuota (mai per `lunghezza pagina < limit`), con deduplica per
   `idCompetizione` applicata preventivamente.
6. Questa azione AJAX restituisce solo il calendario (data, luogo,
   nome, livello) — non le classifiche di gara. I risultati passano
   da pagine HTML statiche separate, vedi sotto.

Pagina `/sci` (`SciPage.tsx`): un tab "Tutte" più un tab per ciascuna
disciplina effettivamente presente nei dati (scoperte dinamicamente,
non una lista fissa — il comitato FVG copre più discipline invernali,
non solo lo sci alpino), un solo pannello con elenco cronologico delle
gare (data, comune/provincia, nome, disciplina, livello, stato) — niente
tabella classifica, coerente col fatto che non esiste un campionato.
Card aggiunta all'hub `/sport`.

`npx tsc --noEmit` e `node --check` puliti. Modulo calendario
**confermato funzionante in produzione dall'utente** (screenshot,
25/08/2026) — il campo `stato` è stato corretto subito dopo (vedi
punto 4 sopra e sezione seguente).

### Risultati gare passate (25/08/2026)

Richiesta successiva dell'utente, dopo aver verificato il calendario in
produzione: mostrare anche i risultati completi delle gare già svolte,
non solo la loro presenza a calendario. Contestualmente segnalato che
il campo `status` dell'API non si aggiorna mai (vedi punto 4 sopra) —
quindi in `mappaGaraSci()` lo stato mostrato (`stato: "Svolta" /
"In programma"`, campo `svolta: boolean`) è ora **sempre calcolato
confrontando la data della gara con oggi**, mai letto da `g.status`
(tenuto comunque come `statoApi`, solo per riferimento/debug).

**Struttura a due livelli scoperta cliccando sul sito**: ogni riga del
calendario è in realtà una "competizione" (evento, es. "Coppa Italia
Skiroll..."), che raggruppa più "gare" singole (una per
disciplina/specialità/categoria/genere — 23 osservate nell'evento
campione). I risultati (posizione, atleta, società, tempo, punti) sono
per singola gara, su una pagina a parte:

- `https://comitati.fisi.org/friuli-venezia-giulia/competizione/?idComp={id}`
  — elenco delle gare di una competizione.
- `https://comitati.fisi.org/friuli-venezia-giulia/gara/?idGara={id}&idComp={idComp}&d=`
  — tabella risultati di una singola gara.

A differenza del calendario (JSON via AJAX), queste due pagine sono
HTML statico — scaricate e analizzate con `cheerio`, struttura
verificata su due pagine reali (outerHTML incollato dall'utente via
DevTools, lo stesso host risulta bloccato dalla allowlist di rete di
questo sandbox). **Trappola scoperta**: entrambe le pagine riusano le
STESSE classi CSS (`.disciplina`, `.luogo`, `.nome`, `.specialità`,
`.status`) con significati completamente diversi da una pagina
all'altra (e diversi anche dal loro significato sul calendario), e il
nome `specialità` contiene un accento — rischioso da usare come
selettore letterale. Per questo l'estrazione in
`fetchGareCompetizioneSci()`/`fetchRisultatiGaraSci()` è **sempre
posizionale** (`.x-col` per indice fisso dentro `.x-row-inner`), mai
per nome di classe — verificato con uno script cheerio contro l'HTML
reale prima di scrivere il codice definitivo, risultati confermati
identici (23 gare, 36 risultati nell'esempio). Altre osservazioni utili
dalla pagina risultati reale: nomi atleta arrivano sia TUTTO MAIUSCOLO
che Title Case (normalizzati in `SciPage.tsx` come per il Tennis);
alcune righe hanno cod.FISI/atleta/anno/società vuoti ma tempo/punti
valorizzati (normale, gestito); "Punti gara" è quasi sempre il
segnaposto letterale `"-"`, trattato come nessun dato (`null`), non
come stringa.

**Volume di richieste**: nessun endpoint bulk noto — una competizione
con 20+ gare richiede 1 richiesta per l'elenco gare + 1 per gara. In
piena stagione (dicembre-marzo) possono esserci decine di competizioni
passate insieme. Per non generare centinaia di richieste ad ogni
esecuzione (ogni 15 minuti): i risultati sono messi in cache in un
secondo snapshot, `sci:risultati` (competizioni già scaricate per
intero non vengono mai ripetute — i risultati di una gara passata non
cambiano più una volta pubblicati, per quanto osservato finora), e al
massimo `FISI_MAX_COMPETIZIONI_NUOVE_PER_ESECUZIONE` (5) competizioni
NUOVE vengono scaricate per esecuzione — le altre restano in coda e
vengono recuperate nelle esecuzioni successive. Lo snapshot non viene
riscritto (niente riga `history` aggiuntiva) se non ci sono novità in
quella esecuzione.

Pagina `/sci`: le gare "Svolta" nel calendario sono cliccabili — si
aprono mostrando l'elenco delle gare della competizione, ciascuna a sua
volta espandibile per vedere la tabella risultati completa. Se i
risultati non sono ancora stati scaricati (in coda, vedi sopra), viene
mostrato un messaggio esplicito invece di una lista vuota.

`npx tsc --noEmit` e `node --check` puliti; logica di estrazione
verificata con uno script cheerio a parte contro l'HTML reale fornito
dall'utente (non solo per ispezione visiva). **Confermato dall'utente in
produzione** (screenshot, 25/08/2026): risultati mostrati correttamente
per una gara di combinata nordica passata.

## Registro modifiche — dentro `/changelog` (25/08/2026)

Richiesta dell'utente: un link in fondo a ogni pagina che porti a un log
con data di tutte le modifiche fatte al sito dall'inizio, aggiornato ad
ogni nuova implementazione/correzione.

**Dati statici**, non un modulo ingerito: `lib/changelog.ts` esporta un
array `CHANGELOG` (`{ data, titolo, dettagli[] }`, più recente in cima)
letto direttamente da `components/ChangelogPage.tsx` (`/changelog`) —
nessuna tabella Supabase, non è un dato che cambia da solo, cambia solo
quando consegniamo qualcosa. Popolato ricostruendo la cronologia da
questo stesso README/dal doc di progetto: le voci dal 22/08/2026 in poi
hanno una data precisa (sessioni datate esplicitamente), quelle
precedenti no (nessun repository Git, nessuno storico consultabile) —
raggruppate sotto l'etichetta "Fase iniziale" invece di inventare una
data, con una nota esplicita in pagina su questo limite.

**Nuovo `Footer.tsx`**, condiviso da tutte le pagine (stesso pattern di
`TopHeader`: importato e reso da ogni pagina, non da `app/layout.tsx`),
con il link "Registro modifiche →" e uno slot opzionale `extra` per
contenuto specifico di pagina (usato solo in homepage, per la riga
"Fonti: ..." che c'era già). Prima di questa modifica solo la homepage
aveva un footer — ora tutte le pagine ne hanno uno, coerente col resto
del sito.

**⚠️ Promemoria per ogni sessione futura, non solo per questa**: da qui
in avanti, ad ogni modifica consegnata (nuovo modulo, correzione,
qualunque cambiamento visibile) va aggiunta una voce in cima a
`CHANGELOG` in `lib/changelog.ts`, oltre ai soliti aggiornamenti di
README.md e `claude/fvgmonitor-stato.md`. Poche righe pensate per chi
usa il sito (cosa è cambiato), non il dettaglio tecnico — quello resta
nei due documenti già esistenti.

`npx tsc --noEmit` pulito. Non ancora confermato dall'utente in
produzione.

## Fase 4 — Responsive (24/08/2026)

Audit mirato su tutti i componenti (`components/*.tsx`), cercando pattern
che possono rompersi su schermi stretti (telefono) anche se sembrano a
posto su desktop. Due bug reali trovati e corretti, non solo rifiniture
estetiche:

1. **`truncate` dentro un flex item senza `min-w-0` non funziona
   davvero** — bug classico di flexbox: un elemento flex ha di default
   `min-width: auto`, che per un testo con `white-space: nowrap` (quello
   che `truncate` imposta) equivale alla larghezza del testo NON
   troncato. Senza `min-w-0` esplicito, quella larghezza minima vince e
   la riga trabocca invece di accorciarsi con "…". Trovato e corretto in
   `TreniPanel.tsx` e `AutobusPanel.tsx` (righe con nome
   stazione/destinazione lunghi accanto a orario/badge a larghezza
   fissa — esattamente il caso che lo fa scattare). Applicato lo stesso
   trattamento (aggiunto `truncate min-w-0`, prima assente del tutto) a
   `VoliPanel.tsx` e `BalneazionePanel.tsx` per coerenza.
2. **Righe "a 4 riquadri per provincia" senza `flex-wrap`** — pattern
   ripetuto in 8 componenti (`AriaQualitaPanel`, `No2Panel`,
   `OzonoPanel`, `AriaPanel`, `Pm25Panel`, `AllertaZonePanel`,
   `FiumeOverview`, `MarePanel`): 4 riquadri `flex-1` (3 per
   `MarePanel`) in una riga senza `flex-wrap`. Su un telefono stretto lo
   spazio disponibile dentro un pannello (~220-240px dopo i padding) è
   inferiore alla larghezza minima che 4 riquadri con "Pordenone" dentro
   richiedono — senza `flex-wrap` traboccano invece di andare a capo su
   due righe. Aggiunto `flex-wrap` al contenitore e `min-w-[72px]` a
   ogni riquadro in tutti e 8 i file.
3. **Banner allerta (`AlertBannerLive.tsx`, quello attivo in homepage)
   senza `flex-wrap`**: badge livello + link "Dettagli ufficiali →" sono
   entrambi `nowrap` e da soli possono occupare quasi tutta la larghezza
   su un telefono — senza `flex-wrap` il testo del messaggio d'allerta
   (potenzialmente lungo) avrebbe fatto traboccare l'intero banner in
   orizzontale. Corretto lo stesso in `AlertBanner.tsx` (variante
   gemella, non attualmente importata da nessuna pagina, ma tenuta
   coerente).

Verificato che i grid a livello di pagina (`grid grid-cols-1 md:...`) e
le tabelle (classifiche sportive, già dentro `overflow-x-auto`) erano
già corretti — nessuna modifica necessaria lì. `npx tsc --noEmit`
pulito dopo tutte le modifiche. **Nessun browser reale disponibile da
questa sessione per una verifica visiva diretta** (stesso limite delle
sessioni precedenti) — i fix sono basati su un'analisi del CSS/flexbox
risultante, non su uno screenshot; utile una conferma dell'utente su un
telefono vero se possibile, specialmente sul pannello Autobus (quello
con più elementi in riga) e sul banner allerta la prossima volta che è
attivo.

## Fusione pannelli homepage — Bora·Vento+Pioggia e Mare+Fiumi (24/08/2026)

L'utente ha segnalato (con screenshot) molto spazio bianco sotto ai
pannelli "Bora · Vento" e "Pioggia" in homepage, rispetto al pannello
"Notizie locali" accanto a loro nella stessa riga della griglia a 3
colonne. Soluzione: unire coppie di pannelli correlati in un unico
`<Panel>` invece di uno ciascuno, così da riempire lo spazio verticale
extra con contenuto reale invece di lasciarlo vuoto.

- **"Bora · Vento e Pioggia"**: un solo `Panel` in `app/page.tsx`
  contiene `<VentoPanel compatto />`, un separatore (`border-t`), poi
  `<PioggiaPanel compatto />`.
- **"Livelli mare e fiumi"**: un solo `Panel` contiene una piccola
  etichetta "Mare" + `<MarePanel />`, poi una piccola etichetta "Fiumi"
  + `<FiumeOverview />` (queste due non avevano bisogno del prop
  `compatto`: non hanno una riga "Fonte: ..." interna da nascondere,
  bastava un'etichetta perché il titolo del Panel unito non nomina più
  esplicitamente "mare" o "fiumi" singolarmente).

**Pattern nuovo: prop `compatto?: boolean`** (default `false`), aggiunto
a `VentoPanel.tsx` e `PioggiaPanel.tsx`. Quando `true`, nasconde la riga
`<p>Fonte: Protezione Civile FVG (CC BY 4.0)</p>` interna al componente
— altrimenti, stando i due pannelli uno sopra l'altro nello stesso
`Panel`, la stessa fonte sarebbe comparsa due volte di fila. Il default
`false` lascia invariato il comportamento ovunque questi due componenti
sono usati come pannelli a sé stanti: `ProvinciaPage.tsx` (pagina di
dettaglio provincia, `<VentoPanel provincia={slug} />` e
`<PioggiaPanel provincia={slug} />`) e `MeteoPage.tsx` (pagina meteo,
stesso pattern con `provincia={filtro}`). Verificato via grep che
`MarePanel`/`FiumeOverview` sono usati SOLO in homepage, quindi nessun
vincolo di retrocompatibilità per quei due.

Griglia homepage passata da 4 slot separati (Bora·Vento, Pioggia,
Livelli fiumi, Livello mare) a 2 slot uniti — libera spazio nella
griglia a 3 colonne e dovrebbe ridurre il vuoto segnalato. `npx tsc
--noEmit` pulito dopo le modifiche. Come per il resto di Fase 4, nessuna
verifica visiva diretta possibile da questa sessione — utile una
conferma dell'utente dopo il redeploy.

## Fase 4 — Accessibilità (24/08/2026)

Seconda area di Fase 4 (rifinitura), dopo Responsive. Audit mirato via grep
sui pattern più a rischio (colore come unico indicatore, bottoni-tab senza
stato ARIA, mappe/iframe senza etichetta, heading mancanti, contrasto
colore) invece di una revisione generica. Diversi problemi reali trovati e
corretti:

1. **Contrasto colore sotto la soglia WCAG AA (4.5:1 testo normale)**,
   verificato calcolando i rapporti di contrasto reali (non a occhio) per
   tutte le coppie testo/sfondo della palette "Adriatico notturno":
   - `ink-faint` (usato per "Fonte:", orari, etichette secondarie in quasi
     40 componenti) era **3.03:1** contro il sfondo più chiaro (panel-alt)
     — sotto 4.5:1. Schiarito da `#6B8A87` a `#92AAA8` in
     `tailwind.config.ts`: un solo valore, l'intero sito ne beneficia.
   - `warm` (colore ritardi treni/voli, citazione fonte notizie) era
     **3.58:1**. Schiarito da `#BD5B37` a `#CD7554` — usato solo come testo,
     mai come sfondo, quindi nessun impatto altrove (cambia di riflesso
     anche lo sfondo di selezione testo, in meglio).
   - Chip zona D (`ZoneChip.tsx`) con testo scuro su sfondo arancio-bruno:
     **3.58:1**. Testo passato a bianco + sfondo scurito leggermente
     (`#BD5B37` → `#BB5A36`) → 4.54:1.
   - Badge "Allerta rossa" (`AlertBanner.tsx`/`AlertBannerLive.tsx`) con
     testo `ink`: **4.44:1**, appena sotto soglia. Passato a testo bianco →
     5.42:1.
2. **Colore come unico indicatore di stato (WCAG 1.4.1)**: alcuni valori
   erano distinguibili SOLO dal colore, senza testo — invisibile a chi non
   percepisce quel colore (es. daltonismo, schermo in scala di grigi).
   Aggiunto un'etichetta testuale in ogni caso reale trovato: orario dei
   voli in ritardo (`VoliPanel.tsx`, aggiunto "rit."), superamento soglia
   qualità dell'aria (`No2Panel`, `OzonoPanel`, `AriaPanel`, `Pm25Panel`,
   `AriaQualitaPanel`, aggiunto "Oltre soglia"/"Oltre soglia OMS"). Trovati
   anche due puntini colorati puramente decorativi (viabilità, balneazione)
   dove il colore non distingue stati diversi — marcati `aria-hidden` invece
   di modificarli, dato che l'informazione è già nel testo adiacente.
3. **Bottoni-tab senza stato comunicato agli screen reader**: tutti i
   gruppi di bottoni "a scheda" del sito (blocco/filtro autobus, stazione
   treno, provincia/prodotto radar, tab qualità aria/pollini/balneazione,
   competizione sport, filtro webcam/meteo — 12 file, ~15 gruppi) erano
   `<button>` reali ma senza alcun indicatore di selezione per chi non vede
   il colore di sfondo cambiare. Aggiunto `aria-pressed` ovunque.
4. **Heading mancanti**: la homepage e le pagine provincia non avevano
   *nessun* heading (zero `<h1>`, i titoli dei pannelli erano `<span>`) —
   chi naviga per intestazioni con uno screen reader non aveva alcun punto
   di riferimento. Aggiunto un `<h1>` invisibile (`sr-only`, design visivo
   invariato) a `app/page.tsx` e `ProvinciaPage.tsx`; promosso il titolo di
   ogni `Panel` da `<span>` a `<h2>` in `components/Panel.tsx` (Tailwind
   preflight azzera già gli stili di default degli heading, quindi
   l'aspetto non cambia — un'unica modifica in un componente condiviso
   copre automaticamente un'ottantina di pannelli in tutto il sito).
5. **Menu hamburger**: si chiudeva solo cliccando fuori o su una voce, non
   con Esc da tastiera — un utente da tastiera restava bloccato col menu
   aperto. Aggiunto Esc-per-chiudere con ritorno del focus sul bottone,
   `aria-controls`, `aria-label` dinamico ("Apri menu"/"Chiudi menu"), e la
   lista voci ora è un `<nav aria-label="Sezioni extra">` invece di un
   `<div>` anonimo. Aggiunto anche `aria-current="page"` alla voce attiva
   nel menu provincia dell'header.
6. **Skip link mancante**: ogni pagina ripete header + menu + banner
   allerte — senza un modo di saltarli, un utente da tastiera deve
   attraversarli ad ogni pagina. Aggiunto un link "Vai al contenuto
   principale" in `app/layout.tsx`, invisibile finché non riceve il focus,
   che punta a un `id="contenuto-principale"` ora presente su ogni `<main>`
   del sito (11 file).
7. **Mappe Leaflet (Terremoti, Radar meteo) senza etichetta**: aggiunto
   `role="region"` + `aria-label` al contenitore. Per i terremoti esiste
   già un elenco testuale equivalente accanto alla mappa (nessuna perdita
   di informazione); per il radar meteo no — è un'immagine di precipitazione
   continua, senza un vero equivalente testuale possibile: limite noto,
   non risolto, documentato qui.

Verificato che le immagini con `<img>` (webcam, radar) avevano già `alt`
corretto, e che i widget ARPA (iframe) avevano già `title`. Aggiunto anche
un piccolo avviso "(si apre in una nuova scheda)" (invisibile, solo per
screen reader) su tutti i link `target="_blank"` del sito (`Panel.tsx` e
altri 6 componenti), per non spiazzare chi non si aspetta il cambio di
contesto. `npx tsc --noEmit` pulito dopo tutte le modifiche. **Nessuno
strumento di controllo automatico reale (es. axe, Lighthouse) disponibile
da questa sessione** — l'audit è manuale, basato su lettura del codice e
calcolo dei contrasti colore, non su una scansione automatizzata; utile
un controllo con axe/Lighthouse o un vero screen reader quando possibile.

## Idee future (annotate, non richieste esplicitamente per l'implementazione)

- **Strutture ricettive** (B&B, agriturismi, hotel, ecc.): possibile nuovo modulo/pagina. Da definire quando richiesto: fonte dati (dataset regionale open data? scraping di un portale turistico, come già fatto per "Eventi"? un'API di settore?), se mostrare disponibilità/prezzi in tempo reale o solo un elenco/mappa statico aggiornato periodicamente, e se organizzarlo per provincia o come le stazioni/fermate (elenco piatto con tab). Nessuna ricerca di fonti fatta finora — da avviare quando l'utente vorrà procedere.
- **Nuoto** (nuova sezione Sport, accanto a Calcio/Basket/Baseball), **accantonata il 25/08/2026 su richiesta dell'utente — da riprendere con la nuova stagione**. Fonte proposta dall'utente: `fin2026.microplustiming.com` (portale risultati FIN, piattaforma Microplus Timing) — es. `NU_2026_07_17-19_Trieste_web.php`, Campionato Regionale Assoluto FVG vasca lunga, Trieste 17-19 luglio 2026. Trovato finora: (1) la pagina base del meeting si legge con WebFetch, ma i link "profondi" a una singola gara (parametri `cat`/`page`/`spec`/`bat`, con `descIT`/`descEN`/`descFR` in base64) restituiscono 403 dal proxy di questa sessione — possibile blocco anti-bot sui link con parametri, non confermato; (2) i risultati delle singole gare NON sono nell'HTML iniziale ma caricati via JavaScript (funzioni tipo `LoadHistory_Calendar()`) da un endpoint non identificato — stesso tipo di ostacolo già visto con gli autobus TPL FVG, ma qui l'endpoint reale non è ancora noto; (3) esiste anche un prodotto ufficiale Microplus "Results Data Feed" (es. `crs-ta2026-rdf.microplustimingservices.com`) ma è dietro login, verosimilmente riservato a stampa accreditata/broadcaster, non un'opzione praticabile. **Prossimo passo quando si riprende**: chiedere all'utente di aprire una pagina risultati nel proprio browser, DevTools → tab Rete → filtro Fetch/XHR, cliccare su una gara e individuare la richiesta che carica i dati (stesso metodo che ha funzionato per gli autobus) — non ancora fatto. Nota di modello: il nuoto non ha una "classifica di campionato" come calcio/basket/baseball (`COMPETIZIONI_CALCIO`/`COMPETIZIONI_BASKET` in `scripts/ingest-light.mjs`, partite + classifica) — sono meeting singoli con risultati gara per gara, quindi anche una volta trovata la fonte tecnica andrà probabilmente ripensato il modello dati (elenco risultati per meeting, non classifica a punti). Discussa anche un'alternativa più leggera mai approfondita: solo calendario meeting FVG + link ai risultati ufficiali, senza estrarre i tempi.

## Prossimo passo

Fatto un giro di audit + fix responsive, poi la fusione dei pannelli
homepage Bora·Vento + Pioggia e Livello mare + Livelli fiumi, poi
l'audit di accessibilità (vedi le tre sezioni "Fase 4" sopra) —
**nessuna delle tre cose ancora confermata dall'utente su un
browser/telefono vero o con uno screen reader**, dato che questa
sessione non ha accesso a nulla di tutto ciò per verificarlo
direttamente. Aggiunto anche il modulo Tennis (`/tennis`, vedi sezione
dedicata sopra) — prima versione aveva un bug di giocatori duplicati
(segnalato dall'utente, corretto il 25/08 con deduplicazione +
classifiche divise per 2ª/3ª/4ª categoria), **non ancora riconfermato
in produzione dopo il fix**. Aggiunto anche il modulo Sci (`/sci`, vedi
sezione dedicata sopra) — calendario gare FISI, **non ancora testato in
produzione**, e per natura della fonte (calendario che si popola nel
tempo) andrà ricontrollato più avanti nella stagione. Resta da fare
l'ultima area di Fase 4: performance (il dominio personalizzato,
`monitor.fvg.it`, è in corso a parte — record DNS in configurazione
presso il registrar, non ancora verificato su Vercel).

Il modulo Autobus ha 6 blocchi (Trieste, Udine, Gorizia, Pordenone,
Trieste Airport, Monfalcone — vedi nota "Autobus" sopra); solo Trieste è
stato confermato in produzione finora. Il modulo Ferrovie funziona (dati
raccolti correttamente, stati "cancellato"/"non partito" distinti, tutte
le 7 stazioni confermate). Idea annotata per il futuro (non richiesta
per l'implementazione): modulo Strutture ricettive (B&B ecc.). Altri
blocchi/fermate autobus verranno aggiunti in futuro su richiesta
esplicita dell'utente, stesso metodo di verifica (script dalla console
del browser).
