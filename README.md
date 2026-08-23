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
| **Webcam regionali** — pagina dedicata `/webcam` | osmer.fvg.it (CC BY-SA 3.0) + turismofvg.it (Panomax/Feratel, statico) | OSMER fa da specchio/proxy delle immagini di terze parti sul proprio dominio (`data-src` relativo) — le mostriamo da un unico dominio. Ogni card è cliccabile e apre la fonte originale (`data-url`) in una nuova scheda; se l'immagine non carica, mostra "Anteprima non disponibile" (`WebcamCard.tsx`, componente condiviso con `/viabilita`). **Nota sulla provincia**: le "zone geografiche" di OSMER non coincidono sempre con i confini provinciali (es. "Costa ovest e Laguna" include sia Grado/GO sia Lignano/UD) — mappa comune→provincia il più precisa possibile (`OSMER_COMUNE_PROVINCIA`), con fallback sulla zona quando il nome non è riconosciuto. Le webcam autostradali (A4/A23/A28/SR354) sono escluse qui e vivono in `/viabilita`. I panorami 360° di turismofvg.it (Panomax/Feratel) sono hardcoded in `WebcamPage.tsx` (elenco statico, non cambia spesso) — embeddati come iframe, non scrapati. **Non verificato**: se l'API monitor.protezionecivile.fvg.it abbia un endpoint webcam (non sembra dall'elenco sensori già esplorato, ma non controllato esplicitamente) |
| **Meteo** — pagina dedicata `/meteo` | Riusa componenti già esistenti (nessuna nuova ingestione) | Consolida bollettino OSMER + temperatura live + widget ARPA + vento + pioggia + radar, organizzati per provincia (o "Tutta la regione"). Raggiungibile dal menu ad amburger, in cima |
| **Radar meteo** | API monitoraggio PC FVG, gruppo `radar` | Solo il radar di Fossalon (id 1) è attivo — Lussari e Mosaico risultano spenti (`status: "X"`). 4 prodotti selezionabili da tab, ciascuno con una breve spiegazione in pagina: `SRTLBM_1` (pioggia, mm), `SSI` (severità temporale), `HMC` (classificazione idrometeore — pioggia/neve/grandine), `LBM_V` (velocità Doppler, m/s) — tutti recuperati in un'unica chiamata (`/radars/1/products` restituisce già tutti i prodotti disponibili insieme). Le immagini sono **trasparenti fuori dalle zone colorate** (nessuna base geografica) — sovrapposte a una vera mappa (Leaflet + tile OpenStreetMap) usando l'`extent` fornito dall'API stessa (`RadarMeteoMap.tsx`, caricato dinamicamente lato client — Leaflet richiede il DOM del browser) |
| **Terremoti** — pagina dedicata `/terremoti` | INGV (FDSN Event Web Service, standard internazionale, gratuito) | L'API PC FVG ha uno schema dati "Earthquake" predisposto ma **nessun endpoint GET pubblicato** per interrogarlo — usiamo quindi la fonte ufficiale italiana per la sismologia. Filtrato per area geografica FVG (bounding box), ultimi 30 giorni. Mappa Leaflet con marker colorati per magnitudo (`TerremotiMap.tsx`) + elenco cronologico |
| **Viabilità** — pagina dedicata `/viabilita` (nel menù ad amburger) + pannello homepage | InfoViaggiando (eventi, feed WFS non dichiarato pubblico — stessa cautela di ANSA) + OSMER (webcam A4/A23/A28/SR354) | La pagina dedicata combina il pannello eventi (`ViabilitaPanel`, stesso dato del pannello homepage), il prezzo carburanti e le webcam autostradali filtrate dallo stesso snapshot `webcam:osmer` usato da `/webcam` |
| **Trasporti** — pagina dedicata `/trasporti` (nel menù ad amburger) | Trieste Airport (voli) + ViaggiaTreno (treni, vedi nota "Ferrovie" sotto) | Pagina distinta da Viabilità (quella resta sul traffico stradale). Contiene il pannello voli (stesso `VoliPanel`/dato `voli:trieste-airport` della homepage) e il pannello treni (`TreniPanel.tsx`, fetch lato client verso una Route Handler nostra, che a sua volta interroga ViaggiaTreno lato server — vedi nota "Ferrovie" sotto) |
| **Prezzo carburanti** (benzina, gasolio, GPL) — homepage + pagina `/viabilita` | CSV ufficiale MIMIT (`MediaRegionaleStradale.csv`, pubblicato ogni mattina alle 8:00) | `CarburantiPanel.tsx`, un solo valore per l'intera regione per ciascun carburante (non per provincia — è così che il ministero lo pubblica, il dato regionale FVG non è scorporato per provincia). Benzina e gasolio self-service, GPL servito (unica modalità rilevante in Italia per ciascuno) — snapshot unico `carburanti` (`{ carburanti: { benzina, gasolio, gpl } }`). Il CSV include anche il metano (servito), non ingerito perché non richiesto — estendibile in futuro aggiungendo una voce a `CARBURANTI_TIPI`. Formato CSV non standard (riga "Aggiornamento" prima dell'intestazione, `;` come separatore) — parsing manuale in `ingest-light.mjs`, nessuna libreria CSV necessaria |
| **Eventi** | Scraping HTML turismofvg.it | Pagina server-rendered, no browser headless — fragile per natura (classi CSS specifiche) |
| **TGR** | — | Nessun feed trovato, link statico alla sezione ufficiale |
| **Trieste Airport** | Scraping HTML triesteairport.it | Stesso approccio degli Eventi, stessa fragilità |

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

## Prossimo passo

Il modulo Ferrovie funziona (dati raccolti correttamente, stati
"cancellato"/"non partito" ora distinti come confermato dall'utente).
Confermata anche l'aggiunta di 3 nuove stazioni (Monfalcone, Trieste
Airport, Tarvisio Boscoverde) oltre ai 4 capoluoghi — altre stazioni
verranno aggiunte in futuro su richiesta esplicita dell'utente (vedi nota
"Ferrovie" sopra per l'elenco completo). Oppure Fase 4 del piano:
rifinitura (responsive, accessibilità, performance), dominio
personalizzato — vedi piano di lavoro per il dettaglio.
