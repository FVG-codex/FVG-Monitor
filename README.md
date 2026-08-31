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
| **Calcio** — pagina dedicata `/calcio` | gare.lnd.it (LND Comitato FVG) | App Inertia.js: la pagina incorpora l'intero stato (partite + classifica) in un tag `<script data-page="app">`, estratto con `cheerio` — niente scraping di HTML visibile. 9 campionati (Eccellenza, Promozione, Prima Categoria A/B/C, Seconda Categoria Gorizia/Pordenone/Udine-B/Udine-C — quest'ultima organizzata per provincia invece che su gironi regionali unificati) selezionabili da tab in pagina — vedi `COMPETIZIONI_CALCIO` in `ingest-light.mjs` per aggiungerne altri. **Due stagioni sempre in ingestione** (`CALCIO_STAGIONI` in `ingest-light.mjs`, snapshot `calcio:<slug>:<stagione>`): quella corrente (default in UI) e la precedente, consultabile da un toggle "Stagione" a fondo pagina su `/calcio` (`CalcioPage.tsx`). **⚠️ Promemoria annuale**: a inizio di ogni nuova stagione (di solito settembre) va aggiornato manualmente l'array `CALCIO_STAGIONI` (nuovo anno in `[0]`, quello uscente scala a `[1]`) e lo `STAGIONI` corrispondente in `CalcioPage.tsx` — altrimenti il sito resta bloccato sulle due stagioni precedenti. Aggiornato il 31/08/2026: `["2026", "2025"]`, verificato che gare.lnd.it pubblica già il calendario 2026/27 (screenshot utente, 1ª giornata 5 settembre 2026) |
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
| **Aviazione** — pagina dedicata `/aviazione` (nel menù ad amburger) | Dati statici raccolti da webaai.it + qnhfly.com, `lib/aviostrutture.ts` | 32 aviostrutture FVG (aeroporti, aviosuperfici, campi volo, elisuperfici), mappa + elenco filtrabile per categoria, con orientamento/lunghezza/pavimentazione pista dove disponibili — vedi note "Aviazione" sotto per i limiti (dati premium esclusi, ecc.) |
| **Farmacie** — hub `/farmacie` (nel menù ad amburger) + 2 pagine | Dataset Socrata Regione FVG "Farmacie di turno" (`jbxd-m6xe`) | Hub con 2 card (stesso pattern di `/sport`/`/strutture-ricettive`): `/farmacie-tutte` (elenco completo, orari di oggi + contatti) e `/farmacie-di-turno` (solo le aperture straordinarie di oggi). Un solo componente `FarmaciePage.tsx` (prop `soloTurno`), stessa snapshot Supabase filtrata client-side — vedi nota "Farmacie" sotto per i dettagli sul calcolo del giorno, sul fuso orario e sulla finestra dati |
| **Strutture ricettive** — hub `/strutture-ricettive` (nel menù ad amburger) + 8 pagine dedicate | 8 dataset Socrata Regione FVG (uno per tipo), `lib/struttureRicettive.ts` | Bed & Breakfast, Affittacamere, Campeggi e Villaggi Turistici, Alloggi Agrituristici, Alberghi Diffusi, Strutture Ricettive a carattere Sociale, Dry Marina/Marina Resort, Rifugi Alpini Escursionistici — un hub con una card per tipo (stesso pattern di `/sport`), ciascuno con la propria pagina (tab per provincia + ricerca testuale). Nessuna mappa: la fonte non pubblica indirizzo, telefono né coordinate per queste 8 categorie — vedi nota "Strutture ricettive" sotto |

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

### Fix — esecuzione rimasta "queued" per oltre 10 minuti (26/08/2026)

Segnalato dall'utente: un'esecuzione dell'ingestione leggera rimasta
"queued" per oltre 10 minuti, non cancellabile dall'interfaccia GitHub.
Verificato su githubstatus.com: nel momento esatto della segnalazione era
in corso un incident reale lato GitHub ("Incident with Actions" — un
failover di database — e "Disruption with some GitHub services") — la
causa immediata di **quel** blocco è quindi un disservizio della
piattaforma, non un bug del progetto: in questi casi l'unica cosa da fare
è aspettare che GitHub risolva.

Rimaneva però un vero punto debole indipendente dall'incident, aggravato
dallo scraper turismofvg.it aggiunto lo stesso giorno (~40 chiamate
`fetch` sequenziali per esecuzione, molte verso siti terzi meno affidabili
delle API della Regione): senza un timeout esplicito, una singola fonte
che accetta la connessione ma non risponde mai può tenere bloccato il job
per diversi minuti a tentativo (default del fetch nativo di Node), e
senza un gruppo di concorrenza nel workflow le esecuzioni successive del
cron (ogni 15 minuti) partono comunque in parallelo invece di aspettare —
in caso di blocco reale, si accumulano finché non si esaurisce il limite
di job concorrenti dell'account, e le nuove restano "queued" indefinitamente.

**Corretto (indipendentemente dall'incident, come prevenzione)**:
- `fetchConRetry()` in `scripts/ingest-light.mjs` ora usa un
  `AbortController` con timeout di 20 secondi per tentativo, invece di
  aspettare il timeout di default del fetch nativo.
- `.github/workflows/ingest-light.yml`: aggiunto `timeout-minutes: 10`
  sul job (tetto rigido, sotto i 15 minuti del cron) e un blocco
  `concurrency` con `cancel-in-progress: true` — se una nuova esecuzione
  parte mentre la precedente è ancora in corso, questa viene cancellata
  invece di restare bloccata, azzerando la possibilità di accumulo.

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

## Aviazione — dentro `/aviazione` (25/08/2026)

Richiesta dell'utente: una nuova sezione Aviazione con il database delle
aviostrutture (aeroporti, aviosuperfici, campi volo) del FVG, fonte
`https://webaai.it/it/aviostrutture/friuli_venezia_giulia` (WebAAI —
World Airfields Directory), integrando tutti i dati disponibili.

**Dati statici, non un modulo ingerito**: a differenza di Calcio/Basket/
Baseball/Tennis/Sci questo non è un dato che cambia di frequente (sono
strutture fisiche, non classifiche/calendari sportivi) — nessuna
`ingestXxx()` in `ingest-light.mjs`, nessuna tabella Supabase. Popolato
una tantum in `lib/aviostrutture.ts` (27 strutture, tipo `Aviostruttura`)
leggendo ogni pagina via **WebFetch** — l'host `webaai.it`, come già
successo con `comitati.fisi.org` e l'host Tennis, risulta bloccato dalla
allowlist di rete di questo sandbox per un fetch/curl diretto, ma qui
**WebFetch stesso ha funzionato**, restituendo i dati reali invece del
solito "nessun markup"/template vuoto che si ha con pagine JS/AJAX-
dipendenti (Nuoto, calendario Sci, ranking Tennis): la pagina è HTML
statico lato server, quindi WebFetch (che converte HTML in markdown) ha
potuto leggerla per intero senza bisogno che l'utente incollasse
l'outerHTML a mano. 27 chiamate WebFetch (una per pagina di dettaglio,
più l'elenco) invece di scrivere selettori cheerio alla cieca su una
struttura HTML mai vista.

**Solo dati pubblici**: gran parte delle informazioni sulla fonte
(contatti, orari, frequenze radio, lunghezza/orientamento/superficie
pista, foto, carte di avvicinamento) è dietro un abbonamento "Premium" a
pagamento — non incluse. Campi pubblici raccolti per struttura: nome,
tipo, categoria (normalizzata per i filtri), codice avioportolano ENAC,
ICAO, comune/località/provincia, indirizzo/CAP (quando presente),
coordinate GPS, quota, numero piste, categorie/abilitazioni di volo
(General Aviation, Advanced UL, Basic UL, Gliders, Helicopters), ENAC
Direzione Territoriale e numero fascicolo (quando presenti), data di
ultimo aggiornamento dichiarata dalla fonte per quella specifica
struttura (varia molto, dal 2019 al 2026 — non è la data della nostra
raccolta).

**Particolarità/limiti scoperti**:

1. La pagina elenco dichiara un totale di "33 strutture", ma l'elenco
   effettivo mostrato ne contiene 27 (verificato con due letture
   indipendenti) — possibile che alcune strutture censite ENAC non siano
   ancora schedate pubblicamente da WebAAI. Usati i 27 confermati, senza
   inventare le altre 6.
2. Una voce ("Aviosuperficie Enemonzo", da non confondere con "Enemonzo"
   campo volo — due strutture distinte nello stesso comune) compare solo
   nell'elenco, senza una pagina di dettaglio propria: nessuna
   coordinata/quota disponibile per questa, mostrata comunque in elenco
   con i soli campi noti.
3. **Diffidare del prefisso del codice avioportolano come indicatore di
   provincia** (stessa lezione già annotata per altri parametri non
   documentati — vedi nota generale in `claude/fvgmonitor-stato.md`):
   "Casarsa della Delizia" ha codice `UD19` (prefisso Udine) ma il comune
   è amministrativamente in provincia di **Pordenone** — corretto nel
   dataset (`provincia: "PN"`), ignorando il prefisso.
4. Le coordinate sulla fonte usano due notazioni diverse a seconda della
   pagina (gradi+minuti decimali in formato aeronautico, es.
   "4549.650N", oppure gradi/minuti/secondi, es. "45°49'39\"N") —
   convertite una volta per tutte in gradi decimali, verificate contro le
   coordinate reali note di Trieste Airport (LIPQ) e Rivolto come
   controllo di sanità prima di fidarsi della conversione per le altre 25.

Pagina `/aviazione` (`AviazionePage.tsx`): filtri per categoria (Tutte,
Aeroporti civili, Aeroporti militari, Aviosuperfici, Campi volo, Piste
dismesse, ciascuno con conteggio), mappa Leaflet (`AviazioneMap.tsx`,
stesso pattern di `TerremotiMap.tsx` — colori per categoria riusati dalla
palette esistente, nessun nuovo colore da verificare per il contrasto) +
elenco testuale equivalente affiancato, link alla scheda completa su
webaai.it quando disponibile. Voce "Aviazione" aggiunta al menu ad
amburger (`MenuHamburger.tsx`).

`npx tsc --noEmit` pulito. **Confermato dall'utente in produzione**
(25/08/2026, dopo il redeploy che include anche l'arricchimento dati
pista/elisuperfici sotto).

## Aviazione — dati pista ed elisuperfici (25/08/2026)

Richiesta di follow-up dell'utente: usare il portale ufficiale ENAC
(`avio-superfici.enac.gov.it`) come fonte, e recuperare orientamento
pista (QFU), lunghezza pista e coordinate per ogni struttura (esempio
dato dall'utente: Casarsa della Delizia, "06/24", "350 metri").

**Il portale ENAC è stato scartato come fonte**: è un'applicazione
JS-dipendente (nessun modo di esprimere il filtro per regione via
parametri URL — tentati senza successo `?regione_id=`, `?province=`,
`/api/public/surfaces?...`), bloccata dalla allowlist di rete di questo
sandbox come gli altri host già noti (`comitati.fisi.org`, host Tennis,
`webaai.it`, `qnhfly.com` — tutti restituiscono `403` a un `curl`
diretto, aggirabile solo con WebFetch). Più importante: le pagine di
dettaglio raggiungibili via WebFetch (`/it/public/surface/show/{id}`)
dichiarano esplicitamente che i dati tecnici (coordinate, comune,
provincia, orientamento/lunghezza pista) "sono pubblicati e
consultabili, previa registrazione, al seguente link www.webaai.it" —
cioè ENAC stesso rimanda al portale già usato (webaai.it) con la stessa
barriera di registrazione per questi campi. Non una fonte alternativa
gratuita.

**Trovata una fonte alternativa gratuita per i dati di pista**:
`qnhfly.com`, un sito italiano di campi volo/aviosuperfici, pubblica
senza registrazione orientamento (QFU), lunghezza e pavimentazione della
pista, oltre a coordinate e quota — dati che su webaai.it sono dietro
paywall "Premium". Verificato leggendo 22 schede di dettaglio via
WebFetch (elenco FVG: `qnhfly.com/en/airfields/06/friuli-venezia giulia`)
e incrociandole per comune/nome con le strutture già presenti nel
dataset. Copre solo le aviosuperfici/campi volo civili minori — non gli
aeroporti militari (Aviano, Rivolto, Casarsa della Delizia) né alcune
strutture minori assenti dal suo elenco (AS77, Piancada, Pravisdomini,
"Aviosuperficie Enemonzo").

**"33 vs 27" — parzialmente risolto**: cercando anche la pagina separata
"elisuperfici" di webaai.it (`webaai.it/it/elistrutture/friuli_venezia_giulia`,
non letta nella raccolta iniziale) e incrociando l'elenco di qnhfly.com,
sono emerse 5 strutture non presenti nell'elenco "aviostrutture"
originale: 2 campi volo civili (Pajaro Loco a Sesto al Reghena,
Aerocampo Prosecco a Sgonico — prima struttura di questo dataset in
provincia di **Trieste**, aggiunta `"TS"` al tipo `provincia`) + 3
elisuperfici (Elifriulia Ronchi, Elifriulia Tolmezzo, Mondschein a
Sappada). Nuovo totale: **32 strutture** (da 27) — 1 in meno del "33"
dichiarato dalla fonte, non risolto del tutto: nessuna fonte pubblica
elenca con certezza una 33ª struttura.

**Casarsa della Delizia — dato dell'utente non riprodotto**:
l'orientamento "06/24" e la lunghezza "350 metri" indicati come esempio
dall'utente non sono stati trovati in nessuna fonte pubblica verificata
per questa specifica struttura (webaai.it: paywall; ENAC: rimanda a
webaai.it; qnhfly.com: non copre installazioni militari; OurAirports:
"No runway information available" per LIDK; airportguide.com e
SkyVector: nessun dato di pista pubblicato). Le coordinate fornite
dall'utente sono state verificate e confermano quelle già presenti nel
dataset (differenza sotto i 30 metri tra le fonti incrociate). Il campo
`pisteDettaglio` per questa struttura resta `null` finché l'utente non
indica la fonte specifica del dato.

**Modifiche al tipo `Aviostruttura`** (`lib/aviostrutture.ts`): nuovo
tipo `PistaDettaglio` (`orientamento`, `lunghezzaM`, `pavimentazione`) e
campo `pisteDettaglio: PistaDettaglio[] | null` (una voce per pista, per
gestire i casi con più di una pista come Gorizia o AVRO Rivoli di
Osoppo), più `fonteDatiPista: string | null` (URL della scheda
qnhfly.com usata, per attribuzione). Categoria `elisuperficie` aggiunta
a `CategoriaAviostruttura`. `AviazionePage.tsx` mostra i dati di pista
per struttura e un filtro "Elisuperfici"; `AviazioneMap.tsx` ha un
nuovo colore per la categoria (`warm`, già verificato per contrasto) e
mostra i dati di pista nel popup.

`npx tsc --noEmit` pulito. **Confermato dall'utente in produzione**
(25/08/2026, dopo redeploy): orientamento/lunghezza/pavimentazione
pista visibili correttamente (verificato dall'utente sull'esempio
Gorizia, 04/22 e 09/27).

## Farmacie — hub `/farmacie` (26/08/2026, esteso lo stesso giorno)

Richiesta dell'utente: una sezione "farmacie" per trovare le farmacie di
turno in FVG, cioè quelle aperte in giornata odierna oltre all'orario
ordinario.

**Fonte**: dataset Socrata ufficiale della Regione FVG "Farmacie di
turno" (`jbxd-m6xe` su `dati.friuliveneziagiulia.it`), lo stesso portale
open-data già usato per Balneazione/Pollini/Ozono/NO2/PM2.5. 417 farmacie
totali, aggiornato dalla Regione ogni giorno alle 01:00. Verificato via
WebFetch (l'host è bloccato per `curl`/fetch diretto dalla allowlist di
rete di questo sandbox, stessa situazione già nota per gli altri host
`dati.friuliveneziagiulia.it` — WebFetch funziona regolarmente anche per
endpoint JSON grezzi, non solo per pagine HTML).

**Struttura del dato**: ogni farmacia ha fino a 17 fasce orarie
(`orari_0_da`/`orari_0_a`/`orari_0_tipo` … `orari_16_*`), di tipo
`"normale"` (orario ordinario) o `"turno"` (apertura straordinaria:
sabato pomeriggio, festivo, notturno...). Una farmacia è "di turno oggi"
se ha almeno una fascia `tipo === "turno"` la cui data di inizio
(`orari_N_da`) è oggi — la finestra dati è autosufficiente per ciascun
giorno: un turno notturno che finisce la mattina dopo compare comunque
nel record di "oggi" con `orari_N_da` che parte esattamente da oggi
00:00 (verificato: interrogando il dataset lo stesso giorno, il minimo
di `orari_0_da` risultava oggi 00:00 e il massimo domani ~09:00 — non
serve incrociare col giorno prima per catturare un turno notturno in
corso).

**Fuso orario**: "oggi" viene calcolato con `Intl.DateTimeFormat` e
`timeZone: "Europe/Rome"` (lo script di ingestione gira su GitHub
Actions in UTC) — stessa cautela già documentata per
`formattaOrarioRichiesta()` in `app/api/treni/[tipo]/[stazione]/route.ts`.
Gli orari nei campi `orari_N_da/a` sono invece trattati come stringa
pura (confronto sui primi 10/16 caratteri), senza passare da `new
Date()`: non è documentato se il dataset esprima l'ora in UTC o già in
locale italiano, e gli orari osservati (es. turno notturno 20:00–08:30)
sono coerenti solo con "ora locale già inclusa nella stringa" — usare
`Date` rischierebbe di applicare un fuso sbagliato una seconda volta.

**Provincia**: ricavata dal campo `idcomune` (codice ISTAT del comune,
senza zero iniziale, es. `"30049"` Lignano → Udine, `"31009"` Grado →
Gorizia) tramite il prefisso a 2 cifre della provincia ISTAT (30 Udine,
31 Gorizia, 32 Trieste, 93 Pordenone) — stesso principio di
`provinciaDaIdBalneazione`, ma formato del codice diverso (qui senza il
prefisso `"IT006"`), quindi una funzione nuova (`provinciaDaIdComuneFarmacia`)
invece di riusare quella esistente.

**UI** (`FarmaciePage.tsx`, `FarmacieMap.tsx`): stesso impianto a due
pannelli (Mappa + Elenco) già usato in Aviazione, con tab per provincia
sopra (stile `BalneazionePanel.tsx`) invece del filtro per categoria.
Ogni farmacia in elenco mostra nome, comune, indirizzo, telefono e
l'orario del turno di oggi (con indicazione "giorno succ." se il turno
finisce dopo mezzanotte). Snapshot Supabase `farmacie`
(`{ data: "YYYY-MM-DD", per_provincia: { ... } }`), stesso pattern di
polling ogni 15 minuti delle altre pagine con dato quasi statico.
Aggiunta voce "Farmacie di turno" al menù ad amburger
(`MenuHamburger.tsx`).

`npx tsc --noEmit` pulito. **Non ancora testato/confermato in
produzione.**

### Divisa in hub + 2 pagine — "Tutte le farmacie" (26/08/2026, stessa giornata)

L'utente ha chiesto di dividere la sezione in due macro-aree, come già
fatto per Sport e Strutture ricettive: una con **tutte** le farmacie
(orari di apertura + contatti) e una solo con le farmacie **di turno**
(comportamento già esistente, invariato).

**Scoperta chiave prima di scrivere codice** (verificato via WebFetch su
righe reali del dataset, non presunto): il dataset `jbxd-m6xe` **non è
una tabella oraria settimanale permanente** — ogni farmacia ha fasce
orarie (`orari_N_da`/`orari_N_a`/`orari_N_tipo`) datate, e la finestra
osservata copre solo **oggi + domani mattina** (stesso limite già
documentato sopra per il calcolo del turno). Una farmacia con orario
"normale" tutti i giorni feriali ha comunque, in un dato momento, solo 2
giorni di fasce nel dataset (oggi e domani) — non un calendario
settimanale completo. Conseguenza diretta: **"tutte le farmacie" mostra
l'orario di OGGI per ciascuna**, non un orario "Lun–Sab" fisso — scelta
esplicita per non inventare un dato che la fonte non fornisce, con
avviso in pagina ("gli orari mostrati sono quelli di oggi ... la fonte
non pubblica un orario settimanale fisso"). Osservato anche che non
tutte le farmacie hanno fasce nella finestra corrente (es. una
succursale con solo nome/indirizzo/telefono e zero `orari_N_*`) — gestito
mostrando "Orario non disponibile" invece di nasconderla dall'elenco.

**Ingestione**: `ingestFarmacie()` (`scripts/ingest-light.mjs`) ora
raccoglie **tutte** le farmacie della snapshot (prima scartava quelle
senza un turno oggi) e per ciascuna tutte le fasce di oggi, **normali E
turno** insieme (`orariOggi`, prima solo `turni` di tipo turno) — un
solo fetch, una sola snapshot Supabase `farmacie`, letta da entrambe le
pagine. Nessuna seconda ingestione necessaria: `/farmacie-di-turno`
filtra client-side le sole farmacie con almeno una fascia
`tipo === "turno"` oggi (`diTurnoOggi()` in `lib/farmacie.ts`, nuovo
file con i tipi condivisi `VoceFarmacia`/`FasciaOraria`/
`SnapshotFarmacie` e l'helper di formattazione `formattaFascia()`).

**UI**: nuovo hub `app/farmacie/page.tsx` (stesso pattern esatto di
`/sport`/`/strutture-ricettive`, 2 card) con voce "Farmacie" nel menù ad
amburger (prima "Farmacie di turno", ora il nome dell'hub). Due nuove
route, `app/farmacie-tutte/page.tsx` e `app/farmacie-di-turno/page.tsx`,
entrambe renderizzano lo stesso `FarmaciePage.tsx` con un prop
`soloTurno: boolean` diverso — un solo componente invece di due quasi
identici (stesso principio già seguito per `StrutturaTipoPage.tsx`).
Aggiunto un campo di ricerca per nome/comune su entrambe le pagine
(prima assente — utile ora che "Tutte le farmacie" mostra ~400 voci per
provincia in alcuni casi, stesso motivo già documentato per
Affittacamere/Bed & Breakfast in Strutture ricettive). Ogni farmacia in
elenco/mappa mostra ora TUTTE le proprie fasce di oggi etichettate
("Orario" per normale, "Turno" per straordinaria) su entrambe le
pagine — la pagina Turno quindi ora mostra anche l'orario ordinario di
oggi accanto al turno, non solo il turno come nella versione precedente
(più informativo, nessuna perdita rispetto a prima).

`npx tsc --noEmit` e `node --check` puliti. **Non ancora
testato/confermato in produzione** — cambia la forma della snapshot
`farmacie` (`turni` → `orariOggi`, ora tutte le farmacie non solo quelle
di turno), servirà un nuovo run dell'ingestione e una verifica visiva su
entrambe le nuove pagine.

### Bug — nessuna farmacia in nessuna pagina (26/08/2026, dopo il primo deploy)

L'utente ha segnalato che entrambe le pagine mostravano zero farmacie in
ogni provincia. **Non era un problema di attesa del refresh giornaliero
della Regione (01:00)**: la causa era un bug in `provinciaDaIdComuneFarmacia()`,
presente fin dall'implementazione originale del modulo (mai stato
notato prima perché la sezione non era mai stata verificata in
produzione). La funzione faceva `String(idcomune).padStart(6, "0")`
prima di leggere i primi 2 caratteri come prefisso provincia — ma
verificato con dati reali (`$select=idcomune&$group=idcomune` sul
dataset) `idcomune` è **sempre lungo esattamente 5 caratteri** (es.
`"32006"` Trieste, `"30129"` Udine, `"31007"` Gorizia, `"93033"`
Pordenone), mai 6: il `padStart` inseriva uno zero spurio in testa
(`"30129"` → `"030129"`), spostando lo slice sui caratteri sbagliati
(`"03"` invece di `"30"`) — nessuna provincia veniva mai riconosciuta,
ogni riga del dataset scartata silenziosamente. **Fix**: rimosso il
`padStart` superfluo, slice diretto sui 5 caratteri originali —
verificato con le 4 città capoluogo che ora restituiscono la provincia
corretta.

`npx tsc --noEmit` e `node --check` puliti.

### Indicatore "Aperta ora" / "Chiusa ora" (26/08/2026, stessa giornata)

L'utente ha chiesto un pallino verde per "Aperta ora" e rosso per
"Chiusa in questo momento", in base all'orario.

**Calcolato lato client**, non nella snapshot Supabase: lo stato
"aperta/chiusa" dipende dall'ora esatta in cui la pagina viene
visitata, non ha senso ricalcolarlo una volta ogni 15 minuti
nell'ingestione (nel peggiore dei casi lo stato sarebbe sbagliato per
quasi 15 minuti dopo l'apertura/chiusura di una fascia). `statoApertura()`
(`lib/farmacie.ts`) confronta l'ora corrente con ciascuna fascia di
`orariOggi` (la farmacia è "aperta" se l'ora corrente cade dentro
almeno una fascia, `da <= adesso < a`) — confronto **per stringa**, non
`Date`, stesso motivo già documentato per gli orari stessi (formato
`"YYYY-MM-DDTHH:MM"`, "ora locale già inclusa" senza fuso esplicito nel
dato sorgente). Un terzo stato, "sconosciuto" (nessuna fascia oggi —
vedi limite della finestra dati sopra), non mostra nessun pallino
invece di azzardare uno stato.

**Fuso orario esplicito anche lato client**: `adessoEuropeRome()`
calcola "adesso" con `Intl.DateTimeFormat`/`timeZone: "Europe/Rome"` nel
browser di chi visita, non l'ora locale del suo dispositivo — un
visitatore da un altro fuso avrebbe altrimenti un confronto sbagliato,
dato che gli orari della fonte sono orario italiano. Aggiornato ogni 30
secondi con un `setInterval`, indipendente dal polling dati esistente
(ogni 15 min).

**UI**: nuovo componente condiviso `StatoApertoBadge.tsx` (pallino +
etichetta testuale, mai il colore da solo — stessa lezione permanente
di Fase 4 Accessibilità, stesso pattern già in uso in
`BalneazionePanel.tsx`/`ViabilitaPanel.tsx`), usato sia nell'elenco
(`FarmaciePage.tsx`, accanto al nome) sia nei popup della mappa
(`FarmacieMap.tsx`, che ora riceve anche `adesso` come prop dal genitore
per restare sincronizzato con l'elenco). Colori riusati dalla palette
esistente (`allerta.verde`/`allerta.rossa`, già verificati per
contrasto in altre sezioni del sito).

`npx tsc --noEmit` pulito.

### Fix — "Chiusa ora" mostrato durante l'orario di apertura (27/08/2026)

L'utente ha segnalato una farmacia con orario 08:30–12:30 mostrata come
"Chiusa ora" alle 10:26, in pieno orario di apertura — screenshot alla
mano, tutte le farmacie in elenco mostravano lo stesso stato "chiuso"
nonostante orari diversi, un pattern più coerente con un problema
sistemico che con quattro farmacie diverse chiuse per coincidenza nello
stesso momento.

**Causa più probabile**: se la snapshot Supabase non è ancora stata
aggiornata per la giornata corrente (es. ingestione in ritardo — proprio
il giorno prima un'esecuzione GitHub Actions era rimasta "queued", vedi
sezione Resilienza di rete sopra), le fasce in `orariOggi` restano datate
ieri mentre `adesso` (calcolato nel browser del visitatore) è già oggi.
Nel confronto per stringa di `statoApertura()`, una data di ieri risulta
**sempre** "prima" di qualunque ora di oggi — quindi il controllo
`adesso < a` risultava sempre falso, e la farmacia veniva marcata
"chiusa" qualunque fosse l'ora reale: un falso negativo silenzioso,
indistinguibile in UI da una farmacia davvero chiusa.

**Fix** (`statoApertura()` in `lib/farmacie.ts`): prima di confrontare
gli orari, la funzione ora tiene solo le fasce datate come "oggi"
secondo lo stesso `adesso` del visitatore (non più fidandosi che
`orariOggi` sia già correttamente filtrato per oggi da parte
dell'ingestione) — se nessuna fascia corrisponde, la snapshot non ha
ancora dati affidabili per la giornata corrente e lo stato torna
"sconosciuto" (nessun pallino) invece di un "chiusa" potenzialmente
falso. Verificato con uno script di test a sé (dati freschi dentro/fuori
finestra, turno notturno a cavallo di mezzanotte, confine esatto di
chiusura, e la riproduzione esatta del bug — snapshot ferma a ieri) prima
di consegnare: tutti i casi si comportano come atteso, incluso quello che
prima falliva.

`npx tsc --noEmit` pulito. Nessun accesso diretto alla snapshot Supabase
in produzione da questa sessione (rete del sandbox non raggiunge
Supabase) — **da confermare con l'utente** che il pallino torni corretto
dopo il prossimo aggiornamento della pagina.

### Fix — la mappa Leaflet copriva il menù ad amburger (27/08/2026, stessa giornata)

Segnalato dall'utente su desktop: aprendo il menù ad amburger sopra la
pagina `/farmacie-tutte`, la mappa lo copriva invece di restarci sotto.

**Causa**: Leaflet imposta `position: relative` su `.leaflet-container`
ma **nessuno z-index esplicito** — senza un valore definito (anche "0"
basta), l'elemento non crea un proprio contesto di stacking CSS, quindi
i suoi pannelli interni (`.leaflet-pane`, e soprattutto i controlli
`.leaflet-top`/`.leaflet-control` come lo zoom, fino a z-index 1000)
"sfuggono" al contenitore e vengono confrontati direttamente con il
resto della pagina — superando lo z-30 del menù.

**Fix** (`app/globals.css`): `.leaflet-container { z-index: 0; }` —
fissare un valore qualsiasi basta a intrappolare i pannelli interni nel
proprio contesto, senza toccare il loro ordine relativo (tile/marker/
popup restano correttamente sovrapposti fra loro). Effetto **globale**:
vale per qualunque mappa Leaflet del sito (Farmacie, Aviazione, e future
sezioni con mappa), non solo la pagina segnalata.

In più, su richiesta esplicita dell'utente: scambiato l'ordine visivo di
Mappa ed Elenco in `FarmaciePage.tsx` (Elenco prima) — su schermi stretti
l'elenco testuale ora compare per primo sotto l'header invece della
mappa.

`npx tsc --noEmit` pulito.

### Filtro per comune (26/08/2026, stessa giornata)

L'utente ha chiesto: dopo aver scelto una provincia in `/farmacie-tutte`,
un secondo livello di tastini con tutti i comuni della provincia, stessa
grafica di quelli provincia — provato prima con Gorizia.

**Implementazione** (`FarmaciePage.tsx`): nuovo stato `comuneSel`
(`string | null`, `null` = "Tutti i comuni"), resettato ad ogni cambio
provincia (`selezionaProvincia()`, sostituisce l'`onClick` diretto sui
tastini provincia) perché l'elenco comuni è specifico della provincia
selezionata. I comuni mostrati (`comuni`, un `useMemo`) sono calcolati
sulla lista già filtrata da `soloTurno` ma PRIMA del filtro
comune/ricerca (`baseProvincia`) — così i tastini e i loro conteggi
restano stabili mentre si digita nella ricerca testuale, stesso
principio già usato per i conteggi dei tastini provincia. Il filtro
finale (`farmacie`) applica in sequenza: provincia (già dato) → comune
selezionato (se presente) → ricerca testuale.

Stessa applicazione automatica a entrambe le pagine (`/farmacie-tutte` e
`/farmacie-di-turno`), essendo lo stesso componente condiviso — non solo
a `/farmacie-tutte` come nella richiesta originale, ma senza costo
aggiuntivo e senza cambiare il comportamento esistente quando non si
seleziona un comune.

`npx tsc --noEmit` pulito.

## Strutture ricettive — 8 registri, hub + 8 pagine (26/08/2026)

Richiesta dell'utente, seguito diretto di una ricognizione dei dataset
disponibili su `dati.friuliveneziagiulia.it`: implementare tutte le
categorie di strutture ricettive trovate, con un hub `/strutture-ricettive`
sul modello di `/sport` (card per tipo) e una pagina dedicata per
ciascun tipo, sullo stesso modello delle pagine sport (`/calcio`,
`/basket`, ecc. sotto l'hub `/sport`).

**8 dataset Socrata**, uno per tipo, tutti con lo **stesso schema
minimale**: `provincia`, `comune`, `denominazione`, `email` (opzionale),
`sito` (opzionale, oggetto `{ url }`). Verificato sulla metadata di 2
degli 8 dataset: **nessun indirizzo, telefono o coordinata** — limite
della fonte stessa, non un'omissione nostra. Conseguenza diretta: **niente
mappa** per questo modulo, a differenza di Aviazione/Farmacie — solo
elenco testuale.

| Tipo | Dataset | Voci | Pagina |
|---|---|---|---|
| Bed & Breakfast | `jzsu-f86x` | 712 | `/bed-and-breakfast` |
| Affittacamere | `6var-2hht` | 822 | `/affittacamere` |
| Campeggi e Villaggi Turistici | `c2n8-qhph` | 37 | `/campeggi` |
| Alloggi Agrituristici | `yg8e-47jy` | 402 | `/agriturismi` |
| Alberghi Diffusi | `69j3-9hcp` | 18 | `/alberghi-diffusi` |
| Strutture Ricettive a carattere Sociale | `csiv-njht` | 113 | `/strutture-sociali` |
| Dry Marina e Marina Resort | `6xk5-2p3e` | 15 | `/marina` |
| Rifugi Alpini Escursionistici | `qnwt-cjvq` | 44 | `/rifugi` |

Conteggi verificati con `$select=count(*)` il 26/08/2026 (2168 voci
totali). Il campo `provincia` è già il nome per esteso in maiuscolo
("UDINE", "GORIZIA", "TRIESTE", "PORDENONE") — a differenza di
Balneazione/Farmacie non serve nessuna decodifica di codice ISTAT, basta
il lowercase.

**Dato di fatto quasi-statico, ma ingerito come un modulo standard**:
la metadata di 2 degli 8 dataset (Bed & Breakfast, Rifugi) riporta
`rowsUpdatedAt` a settembre 2024 — fermi da quasi 2 anni al momento di
questa sessione. Nella sostanza è un registro "quasi statico" come
Aviazione, ma qui **esiste una vera API Socrata** dietro (niente
raccolta manuale via WebFetch pagina per pagina come per webaai.it):
usare il pattern di ingestione standard costa lo stesso zero sforzo in
più e mantiene il modulo aggiornato da solo se la Regione pubblica
nuove voci, invece di restare fermo alla sessione in cui è stato
raccolto — quindi niente file statico `lib/xxx.ts`, ma
`ingestStruttureRicettive()` in `scripts/ingest-light.mjs`.

**Un'unica funzione ingerisce tutti e 8 i tipi in parallelo**
(`Promise.allSettled`, un tipo fallito non blocca gli altri) e scrive
un'**unica snapshot Supabase** `strutture-ricettive`
(`{ aggiornato_al, tipi: { bb: { totale, per_provincia }, ... } }`)
invece di 8 snapshot separate — un solo job in `main()`, una sola riga
di storico per esecuzione.

**UI**: hub `app/strutture-ricettive/page.tsx` con una card per tipo
(icona SVG lineare + nome + descrizione), stesso pattern di
`app/sport/page.tsx`. Ogni tipo ha una pagina dedicata
(`components/StrutturaTipoPage.tsx`, un solo componente riusato dagli 8
file `app/<slug>/page.tsx` con un prop `tipo` diverso — evita 8
componenti quasi identici) con tab per provincia + conteggio (stile
Aviazione/Farmacie) e in più un campo di ricerca testuale per nome/comune
(aggiunto per via del volume — Affittacamere e Bed & Breakfast hanno
centinaia di voci ciascuno, poco navigabili con i soli tab). Ogni voce
mostra nome, comune, e link a sito/email quando disponibili. Voce
"Strutture ricettive" aggiunta al menù ad amburger.

`npx tsc --noEmit` e `node --check` puliti. **Non ancora testato/confermato
in produzione.**

### Arricchimento contatti — OpenStreetMap (26/08/2026, stessa giornata)

L'utente ha chiesto se fosse possibile recuperare indirizzo/telefono/sito
da altre fonti, vincolando esplicitamente la ricerca a **solo dati
aperti**. Fonti valutate e scartate: turismofvg.it (non ha una licenza
open data dichiarata, solo un sito pubblico — ma vedi sotto, l'utente ha
poi chiesto di usarlo comunque), Google Places API (a pagamento),
Camera di Commercio (accesso bulk a pagamento). Resta **OpenStreetMap**
(licenza ODbL).

Overpass API e Nominatim sono entrambi bloccati dalla rete di questo
sandbox (stesso limite di sempre) — l'utente ha eseguito lui stesso una
query Overpass Turbo (nodi/way/relation con `tourism` ∈
{hotel,apartment,guest_house,hostel,camp_site,alpine_hut,wilderness_hut,
chalet,motel} o `leisure=marina` nella regione FVG, ISO3166-2 `IT-36`) e
caricato l'export GeoJSON (1418 elementi). Filtrato ai ~843 con almeno un
campo utile (indirizzo/telefono/sito/email) e salvato **staticamente**
in `scripts/data/osm-strutture-ricettive.json` — non riscaricato ad ogni
esecuzione (nessuna API OSM raggiungibile da qui): se servirà un
aggiornamento, va ripetuta la stessa procedura manuale.

**Abbinamento nome+comune, euristico** (nessun ID condiviso fra i
dataset Regione e OSM): normalizzazione (maiuscolo, accenti rimossi),
rimozione di parole generiche ("DI", "B&B", "HOTEL", "CASA", "VILLA",
"AGRITURISMO"...) e — lezione trovata **con dati reali**, non a tavolino
— anche delle parole del COMUNE stesso. Prima di questa correzione,
quasi ogni B&B di Trieste con "Trieste" nel nome (es. "Trieste Plus",
"Bora di Trieste") veniva abbinato per errore a un unico "B&B Hotel
Trieste" su OSM, il cui unico token dopo la pulizia restava "TRIESTE" —
lungo abbastanza da sembrare distintivo, ma privo di significato perché
è solo il nome della città. Corretto togliendo anche le parole del
comune dai due lati del confronto prima del test. Seconda correzione,
sempre trovata sui dati reali: un solo token in comune non basta se è
corto (es. "MARE", 4 lettere, abbinava "Pino Mare" a un "Hotel Mare" non
correlato) — richiesto un minimo di 6 caratteri per un match a un solo
token.

**Copertura reale misurata** (non stimata) su campioni completi/parziali
via WebFetch, molto diseguale per tipo: Campeggi 15/37 (41%, dataset
piccolo e nomi commerciali distintivi — buona corrispondenza OSM),
Marina 2/15 (13%), Rifugi 2/44 (5% — la maggior parte dei rifugi OSM non
ha proprio un tag comune, isolati in montagna, o usa il nome della
frazione invece del comune amministrativo, es. "Sella Nevea" invece di
"Chiusaforte"), B&B (campione: 128 voci di Trieste) 1/130 (<1% — nomi
Socrata nella forma "NOME di COGNOME proprietario", spesso poco
sovrapponibili a OSM, e molti B&B piccoli non sono mappati affatto).
Attesa bassa anche per Affittacamere/Agriturismi/Sociali, non
campionati nel dettaglio ma con la stessa dinamica di B&B.

**Implementazione**: nuovo campo `contatti: ContattiArricchiti | null`
per voce (`lib/struttureRicettive.ts`), pensato per più di una fonte —
`fonte: "osm" | "turismofvg"` — così l'arricchimento futuro da
turismofvg.it (vedi Idee future, molto più ricco) potrà convivere o
sostituire gradualmente i match OSM senza cambiare lo schema. Mostrato
in `StrutturaTipoPage.tsx` con l'etichetta "(OSM)" per trasparenza — non
è un dato ufficiale della Regione, va segnalato come tale. Ancora
nessuna mappa: le coordinate, quando presenti nell'arricchimento, non
sono usate per una mappa in questa consegna.

`npx tsc --noEmit` e `node --check` puliti. **Non ancora
testato/confermato in produzione** — il file OSM è statico e già
verificato con query di test sui dati reali sopra, ma il merge dentro
`ingestTipoStrutturaRicettiva()` non è mai girato su GitHub Actions.

### Agriturismi — scraping incrementale turismofvg.it (26/08/2026, stessa giornata)

Seguito diretto della nota "Idee future" sopra: turismofvg.it era stato
scartato come fonte open data (nessuna licenza dichiarata) ma l'utente ha
chiesto comunque di usarlo per l'arricchimento contatti — più ricco di
OSM (indirizzo, telefono, email, sito, titolare, CIN quando presente) e
mantenuto dagli operatori stessi, non un estratto di terzi.

**Struttura del sito, verificata su HTML reale fornito dall'utente**
(non solo via WebFetch, che restituisce markdown e non l'HTML grezzo
necessario per scrivere selettori cheerio corretti):

- Correggeva un'ipotesi sbagliata di una fase di ricerca precedente: la
  paginazione dell'elenco (`/{Categoria}/Search?filters.PageIndex=N`)
  **non è AJAX**, è un semplice GET server-rendered.
- Scoperta più importante: la stessa pagina elenco contiene un campo
  nascosto `<input id="mapdata" value="[...]">` con **l'intero indice
  della categoria in JSON** (Id, Name, Url, City, Latitude, Longitude) —
  un solo fetch per l'intero catalogo, niente crawling di pagine.
- La scheda di dettaglio ha i contatti in una sezione
  `<section class="c-poi__auxtexts">` con coppie ripetute
  `<strong>Etichetta</strong><br>Valore<br><br>` (il valore a volte è un
  link, es. la Pec come `mailto:`). Il parser (`estraiCampiAuxTexts` in
  `scripts/ingest-light.mjs`) è generico — legge qualunque etichetta
  trovi invece di presupporne un elenco fisso — verificato con uno
  script cheerio a sé contro l'HTML reale della scheda campione
  ("Famiglia Loner" Di Zucco Marina, Martignacco) prima di scrivere il
  codice di produzione.

**Solo Agriturismi per ora** (`TURISMOFVG_CATEGORIE` in
`scripts/ingest-light.mjs`): è l'unica categoria verificata sulla
struttura HTML reale. Le altre 7 categorie del sito potrebbero avere
URL o etichette diverse — vanno validate con un altro campione reale
prima di aggiungerle, stessa cautela già seguita qui.

**Stesso pattern di cache incrementale già usato per i risultati gara
Sci**: l'indice (mapdata) viene riscaricato ad ogni esecuzione (economico,
1 richiesta), ma le schede di dettaglio vengono scaricate al massimo
`TURISMOFVG_MAX_NUOVE_SCHEDE_PER_ESECUZIONE` (20) per esecuzione e messe
in cache permanente in una nuova snapshot Supabase `turismofvg:agriturismi`
— una scheda già scaricata non viene mai ripetuta. Con ~750 Agriturismi
nell'indice, la copertura completa richiede diverse ore dal primo avvio
(circa 40 esecuzioni da 15 minuti), poi resta aggiornata incrementalmente.
Il match con i dataset Regione resta l'abbinamento euristico nome+comune
già usato per OSM (nessun ID condiviso tra le fonti).

**Precedenza**: quando turismofvg.it ha un match con scheda già scaricata,
i suoi contatti sostituiscono quelli OSM per quella voce (`fonte:
"turismofvg"` invece di `"osm"` in `ContattiArricchiti`, ora esteso con
`titolare`/`cin` — solo da turismofvg.it). Per i restanti 7 tipi di
struttura ricettiva, OSM resta l'unica fonte. UI aggiornata
(`StrutturaTipoPage.tsx`): l'etichetta accanto a indirizzo/telefono ora
mostra "OSM" o "TurismoFVG" a seconda della fonte reale della singola
voce, invece del testo fisso "(OSM)" di prima; titolare e CIN, quando
presenti, mostrati in una riga a parte.

`npx tsc --noEmit` e `node --check` puliti. Parsing HTML verificato con
uno script di test a sé contro l'HTML reale fornito dall'utente (elenco
e scheda di dettaglio) — vedi sopra. **Non ancora testato/confermato in
produzione**: il fetch live da GitHub Actions verso turismofvg.it non è
mai girato (questo sandbox non può verificarlo, la rete di GitHub
Actions è diversa da qui — stesso limite già noto per altre fonti come
FISI/Sci), e la prima esecuzione reale determinerà se la copertura e i
tempi stimati sopra sono corretti.

### Altre 7 categorie — motore booking TFVGB (28/08/2026)

Estende l'arricchimento contatti turismofvg.it (sopra) da "solo
Agriturismi" a tutte le 8 categorie di Strutture Ricettive: B&B,
Affittacamere, Campeggi e Villaggi Turistici, Alberghi Diffusi,
Strutture a carattere Sociale, Dry Marina e Marina Resort, Rifugi.

**Un sottosistema del sito diverso, non lo stesso pattern CMS**:
verificato con HTML reale fornito dall'utente (una pagina elenco filtrata
per categoria e una scheda di dettaglio, "Nadia" — Affittacamere), queste
7 categorie vivono nel motore di prenotazione legacy `turismofvg.it/TFVGB/
...` (piattaforma Ikon/Insiel), non nelle pagine CMS di Agriturismi:
niente campo nascosto `#mapdata` con l'indice intero, niente sezione
`.c-poi__auxtexts`. Due differenze sostanziali:

- **Elenco paginato, non un indice unico**: ~8 strutture a pagina (es.
  Affittacamere = 549 strutture / 69 pagine) tramite
  `/TFVGB/Booking/Paginazione_New?pagina=N&ordine=0&asc=1`.
- **Filtro categoria e paginazione dipendenti da una sessione (cookie)**,
  non dall'URL — verificato empiricamente: una richiesta a
  `Paginazione_New` senza prima aprire una sessione con
  `search_fromurl?deciso=on&Cat=N` (e senza cookie) torna vuota (0
  strutture). Ogni categoria apre quindi una sessione
  (`apriSessioneTfvgb`) e riusa lo stesso cookie per le pagine successive
  — l'unica fonte di questo progetto che deve mantenere uno stato di
  sessione tra richieste, tutte le altre sono stateless.

**Costo per esecuzione tenuto sotto controllo con un cursore per
categoria**: ripaginare TUTTE le pagine di ogni categoria ad ogni
esecuzione (ogni 15 minuti, insieme a tutto il resto che fa lo script
nello stesso timeout di 10 minuti) non è sostenibile. Si avanza quindi di
`TFVGB_MAX_PAGINE_INDICE_PER_ESECUZIONE` (6) pagine nuove a esecuzione per
ciascun Cat=, con il cursore persistito nello snapshot (`paginazione`);
una volta raggiunta l'ultima pagina l'indice è "completo" e le esecuzioni
successive ricontrollano solo la pagina 1 (già gratis con l'apertura
sessione) per accorgersi di nuove strutture o di un numero di pagine
cambiato. Le schede di dettaglio restano capped a
`TFVGB_MAX_NUOVE_SCHEDE_PER_ESECUZIONE` (10) per esecuzione e cachate per
sempre, stesso pattern di Agriturismi/sci/bike. Per Affittacamere (69
pagine), la sola costruzione dell'indice richiede una dozzina di
esecuzioni (~3 ore) prima che tutte le 549 schede risultino note e pronte
per l'arricchimento contatti.

**La pagina elenco serve solo a scoprire id+URL** (link
`/TFVGB/Strutture/{id}/{slug}`) — non è usata per nome/tipologia/
indirizzo: quei selettori non sono riverificati su un campione fresco
della pagina elenco in questa sessione (solo su HTML analizzato in una
sessione precedente). Nome/comune/contatti vengono **sempre dalla scheda
di dettaglio**, la cui struttura è verificata su HTML reale (scheda
"Nadia", Affittacamere, id 218) e testata con uno script cheerio a sé
prima di essere messa in produzione:

- Blocco `<div class="indirizzo">`, righe separate da `<br>`: le righe
  prima del primo campo riconosciuto sono l'indirizzo (via/civico e
  CAP+comune su due righe), poi telefono (prefisso "Tel "), cellulare
  ("Cell. ", usato come ripiego se manca il telefono — stessa convenzione
  di Agriturismi), un link `<a class="link_web">` per il sito, e CIN
  ("CIN ") quando presente.
- Nessun campo "comune" dedicato: ricavato dal CAP+città in fondo
  all'indirizzo, o in mancanza dal parametro `localita` del link
  "Richiesta informazioni" (`/InfoRequest/InfoAlloggi?...&mailTo=...&
  localita=...`), che fornisce anche l'email in modo più affidabile di
  qualunque scraping testuale.
- **Nessuna coordinata**: a differenza di Agriturismi/OSM, le schede
  TFVGB non pubblicano lat/lon nell'HTML base (la tab "Mappa" è caricata
  via script) — le voci arricchite da questa fonte restano senza pin.

**"Campeggi e Villaggi Turistici"** è un solo tipo nel registro Regione
ma due categorie distinte sul motore TFVGB (Cat=6 "Campeggi" e Cat=14
"Villaggi Turistici", confermati dal menu "Dove dormire" incollato
dall'utente) — entrambe interrogate e unite sotto lo stesso tipoSlug
`campeggi`.

**Solo Affittacamere verificato su campione reale** — le altre 6
categorie condividono lo stesso motore booking quindi dovrebbero avere
la stessa struttura di scheda, ma non ancora confermato scheda per
scheda: se una categoria desse sistematicamente 0 contatti nei prossimi
giorni, è il primo posto da controllare.

`npx tsc --noEmit` e `node --check` puliti. Parser (`estraiCampiIndirizzoTfvgb`,
`estraiVociListaTfvgb`, `estraiTotalePagineTfvgb`) verificati con script
di test a sé contro l'HTML reale della scheda Nadia e contro un elenco
rappresentativo. **Non ancora testato in produzione**: il fetch live da
GitHub Actions (sessione/cookie inclusi) non è mai girato — stesso limite
di rete di questo sandbox già noto per turismofvg.it/FISI.

### Fix — "Sito" mostrava un'email (categoria Marina, 28/08/2026)

L'utente ha segnalato (con screenshot di produzione, prima verifica reale
di questa sezione) più voci della categoria Marina che mostravano "Sito →"
seguito da un indirizzo email invece di un URL (es. "Sito →
marina@ppst.it").

**Causa**: la classe `a.link_web` dentro il blocco `<div class="indirizzo">`
(usata per il sito nella scheda Nadia, unico campione verificato finora)
viene riusata dal sito anche per un link "contattaci via email" quando la
struttura non ha un sito vero — l'href in quel caso è un `mailto:`, non un
URL. `estraiCampiIndirizzoTfvgb` salvava l'href così com'era, qualunque
fosse, dentro `campi.sito`.

**Fix**: un href `mailto:` non diventa più `sito` — diventa un'email di
ripiego (`emailDaLinkWeb`), usata solo se il link "Richiesta informazioni"
non ne fornisce una propria. Verificato con 3 casi in uno script di test a
sé (solo mailto senza altri campi — caso Marina Portopiccolo; sito vero
con indirizzo/telefono/CIN — caso Nadia, per non rompere quanto già
funzionava; indirizzo+telefono+sito vero+CIN — caso Marina Lepanto,
riprodotto esattamente dallo screenshot dell'utente).

**Le schede già scaricate con questo difetto non si correggono da sole**
(la cache per-id è permanente, vedi nota architettura): `ingestTfvgbCategoria`
ora invalida una tantum ogni scheda già in cache il cui `sito` salvato
somiglia a un'email — tornano "nuove" e vengono ri-scaricate con la
correzione nei normali limiti per esecuzione, senza bisogno di alcun
intervento manuale su Supabase.

`npx tsc --noEmit` e `node --check` puliti. **Non ancora confermato
dall'utente dopo il fix** — servirà qualche esecuzione perché le schede
invalidate vengano ri-scaricate e la correzione risulti visibile su
`/marina`.

## Piste Ciclabili — nuova sezione `/piste-ciclabili` (27/08/2026)

Dopo Farmacie e Strutture ricettive, l'utente ha chiesto una ricognizione
di cos'altro si può ricavare da `dati.friuliveneziagiulia.it` (Ambiente,
Mobilità, Punti WIFI). Fatta con 3 agenti paralleli (uno per tema, via
WebFetch su righe reali + metadata di 11 dataset) — risultati nella nota
di progetto (`claude/fvgmonitor-stato.md`). L'utente ha scelto di
partire da Piste Ciclabili (dataset `7eat-pecq`), il più aggiornato di
tutti (2 giorni prima della ricognizione).

**Verifica prima di scrivere codice** (via WebFetch su righe/metadata
reali, non presunto):

- **Copertura PARZIALE**: la fonte è "Ciclovie di interesse locale
  fornite in fase di conformazione" — solo i tracciati che i singoli
  Comuni hanno trasmesso alla Regione durante una specifica procedura
  urbanistica, non un censimento completo. Bounding box reale
  (`$select=extent(the_geom)`): lon 12.42–13.49, lat 45.72–46.12 — un'
  area centrale (Udine/Gorizia), non copre Trieste né l'estremo ovest di
  Pordenone né la fascia alpina. **Dichiarato esplicitamente in UI**,
  stesso principio già seguito per Balneazione/Farmacie.
- **486 righe, solo 36 nomi distinti** (`$select=count(distinct nome)`):
  ogni percorso nominato è diviso in più segmenti — l'elenco raggruppa
  per nome (`raggruppaPerNome()` in `lib/pisteCiclabili.ts`), non elenca
  486 righe quasi ripetute.
  `livello` non è utile per filtrare (485/486 = "locale", verificato con
  `$group=livello`) — niente campo comune/provincia in questo dataset,
  quindi niente tab per provincia qui, solo mappa + elenco con ricerca
  per nome.
- `lunghezza` (metri) manca per alcune righe — la somma per percorso può
  quindi essere una sottostima quando accade, segnalato in UI con
  l'etichetta "(parziale)".
- **Geometria**: `the_geom`, GeoJSON `MultiLineString` — coppie
  **[lon, lat]** (standard GeoJSON, verificato su righe reali). Invertito
  in **[lat, lon]** una sola volta in ingestione (`ingestPisteCiclabili()`
  in `scripts/ingest-light.mjs`), non ad ogni render lato client.

**Prima mappa del sito con tracciati/polilinee** invece di semplici
marker puntuali (Farmacie/Aviazione/Terremoti) — `PisteCiclabiliMap.tsx`
usa `<Polyline>` di react-leaflet (già in uso, 4.2.1, nessuna nuova
dipendenza). Un solo colore per tutti i tracciati (nessun campo utile
per differenziarli via colore, a differenza di Aviazione).

**UI**: pagina singola `/piste-ciclabili` (non un hub — Ciclovie 2020 e
Rete viaria, gli altri due dataset Mobilità, non ancora implementati,
vedi nota di progetto), voce "Piste ciclabili" nel menù ad amburger.
Elenco prima della mappa (stessa preferenza già applicata a Farmacie il
giorno prima).

`npx tsc --noEmit` e `node --check` puliti. Parsing geometria (inversione
lon/lat, `MultiLineString` con più linee, riga senza geometria valida) e
raggruppamento per nome (somma lunghezza, flag "parziale") verificati con
script di test a sé contro dati ricostruiti realistici, prima di
consegnare. **Non ancora testato/confermato in produzione** — servirà un
run dell'ingestione (nuova, mai girata su dati reali da GitHub Actions) e
una verifica visiva su `/piste-ciclabili`.

### Comune di partenza/arrivo, provincia e click-per-evidenziare (27/08/2026, stessa giornata)

L'utente ha chiesto tre cose in più: comune di partenza e arrivo di ogni
percorso "quando possibile", la provincia di appartenenza, e la
possibilità di cliccare un nome nell'elenco per vederlo evidenziato sulla
mappa.

**Comune/provincia — via reverse geocoding, non nel dataset originale**:
il dataset Piste Ciclabili non ha alcun campo comune/provincia (vedi
sezione sopra). Aggiunto `arricchisciPisteCiclabiliConGeocoding()` in
`scripts/ingest-light.mjs`: per ciascuno dei 36 percorsi, geocodifica
inversa (Nominatim/OpenStreetMap) sui due punti estremi (primo punto del
primo segmento, ultimo punto dell'ultimo segmento, nell'ordine della
fonte) — provincia dal campo `ISO3166-2-lvl6` quando presente (es.
"IT-UD" → udine, il più affidabile perché un codice, non un nome
libero), comune dal primo campo disponibile tra
`city`/`town`/`village`/`hamlet`/`municipality`. Cache **permanente** per
nome (snapshot `piste-ciclabili-geocoding`), backfill incrementale al
massimo 15 percorsi nuovi per esecuzione con una pausa di 1,1s tra le
richieste (politica d'uso di Nominatim: max ~1 richiesta/secondo, User-
Agent identificativo) — con soli 36 percorsi (72 richieste) il backfill
completo richiede poche esecuzioni.

**Limite dichiarato, non nascosto**: un percorso diviso in più segmenti
(es. "Buttrio_GiroMontecristo", 6 segmenti) non ha un ordine spaziale
garantito nella fonte — "partenza"/"arrivo" sono quindi il primo/ultimo
punto nell'ordine della fonte, non un itinerario continuo verificato.
Segnalato con "(indicativo)" in UI quando un percorso ha più di un
segmento (`partenzaArrivoApprossimati` in `lib/pisteCiclabili.ts`).

**Non verificabile da questa sessione**: Nominatim è bloccato dalla rete
di questo sandbox anche per WebFetch (il suo `robots.txt` vieta
esplicitamente l'endpoint `/reverse`, a differenza degli endpoint JSON di
`dati.friuliveneziagiulia.it` che invece funzionano) — il formato di
risposta usato nel codice è quello documentato e stabile dell'API
pubblica, ma va confermato al primo run reale da GitHub Actions (rete
diversa da questo sandbox, non bloccata). Il codice degrada senza
rompersi se il formato risultasse diverso (comune/provincia restano
`null`, mai un dato inventato) o se Nominatim blocca le richieste dagli
IP dei runner (già capitato con TPL FVG/autobus per un motivo simile,
vedi sezione Autobus) — in quel caso i segmenti e la mappa restano
comunque disponibili, solo senza comune/provincia.

**Click per evidenziare**: nuovo stato `percorsoSelezionato` in
`PisteCiclabiliPage.tsx` — il nome di ogni percorso nell'elenco è ora un
bottone; al click, `PisteCiclabiliMap.tsx` riceve il nome selezionato
(`evidenziato`), calcola i punti estremi di tutte le sue linee e adatta
la vista con `fitBounds` (via `ref` sul `MapContainer` di react-leaflet
4, non più solo `whenCreated` come in versioni precedenti della
libreria), oltre a disegnarlo in un colore diverso (rosso allerta,
tratto più spesso) e attenuare gli altri tracciati. Link "Mostra tutta la
mappa" per tornare alla vista d'insieme.

`npx tsc --noEmit` e `node --check` puliti. Estrazione comune/provincia
dalla risposta Nominatim (con e senza campi presenti, fallback a catena)
e raggruppamento con arricchimento verificati con script di test a sé
contro risposte ricostruite realistiche. **Non ancora testato/confermato
in produzione** per la parte di geocoding (vedi sopra) — il click-per-
evidenziare non dipende da dati esterni ed è verificabile solo
visivamente al prossimo redeploy.

### Fonti turismofvg.it/it/bike — 4 serie con codice (28/08/2026, estese lo stesso giorno)

L'utente ha chiesto se turismofvg.it/it/bike si potesse usare come fonte
aggiuntiva per i percorsi ciclabili. Ricognizione completa del sito prima
di scrivere codice (~130-140 percorsi unici su 4 serie con codice — R
anelli ~70-75, P lineari ~40, C ciclovie a tappe ~18-20, M mountain bike
~3-5 — più 9 categorie "tematiche" che sono ri-etichettature delle stesse
serie R/P, non cataloghi nuovi, e 6 categorie non pertinenti da
escludere), poi scelta dell'utente: iniziare dalla sola serie R (anelli),
mostrata **nella stessa pagina** `/piste-ciclabili` come fonte
indipendente — non unita ai dati Regione (sono cataloghi diversi, senza
corrispondenza 1:1 fra le voci), ma affiancata con etichetta di fonte
chiara. **Estesa lo stesso giorno alle altre 3 serie** (P percorsi
lineari, C ciclovie a tappe, M mountain bike) dopo l'ok esplicito
dell'utente a procedere — vedi caveat sulla verifica più sotto.

**Verificato con HTML reale prima di scrivere lo scraper** (prassi del
progetto, stessa già seguita per gli Agriturismi): richiesto e ricevuto
dall'utente l'HTML vero (non il markdown di WebFetch, insufficiente per
scrivere selettori corretti) sia della pagina elenco
(`/it/bike/percorsi-giornalieri-ad-anello`) sia di una scheda di
dettaglio (`R001`).

**Pagina elenco**: un campo nascosto `<input class="js-ulmap__mapdata">`
contiene un indice JSON completo di tutti i percorsi della serie
(id/titolo con codice/url/coordinate) — WebFetch in una sessione
precedente non l'aveva trovato (mostra solo il markdown reso, non l'HTML
grezzo), da cui la richiesta dell'HTML vero. Le card `<a class="o-card">`
della stessa pagina elencano anche, per ogni percorso, i comuni
attraversati (`.o-card__locality`) — dato ottenuto quindi **senza alcun
geocoding**, a differenza della fonte Regione.

**Scheda di dettaglio**: i dati tecnici (lunghezza, dislivelli, quota
min/max, durata, difficoltà, punto di partenza/arrivo con nome e
coordinate, tracciato completo) sono letti da un blocco
`<script type="application/ld+json">` (schema.org `SportsActivityLocation`)
— molto più affidabile della struttura HTML circostante perché pensato
per essere letto da macchine. L'unico dato letto dall'HTML (non dal
JSON-LD) è l'etichetta italiana di difficoltà (es. "media"), con ripiego
sulla traduzione del valore JSON-LD (inglese, es. "moderate") se il
selettore non trova nulla. Il tracciato completo (`geo.line`, formato
"lat lon lat lon ...", **non frammentato** a differenza della fonte
Regione) e l'id interno Outdooractive (da `@id`, usato per costruire i
link di download GPX/KML/FIT) vengono anch'essi dal JSON-LD.

**Provincia**: nessun campo esplicito nel dataset — derivata dai comuni
attraversati (dalla pagina elenco) con una nuova mappa comune→provincia
completa dei 215 comuni del FVG (`lib/comuniFvg.ts`, duplicata in JS in
`scripts/ingest-light.mjs` per lo stesso vincolo — niente import
TypeScript nello script di ingestione — già documentato per il
geocoding Nominatim sopra), verificata incrociando Wikipedia, ISTAT e i
siti ufficiali dei comuni tramite un agente di ricerca dedicato. Quando
un percorso attraversa comuni di più province (raro), si usa la
provincia più frequente tra quelle riconosciute.

**Ingestione**: `ingestTurismoFvgBikeSerie(serie)` in
`scripts/ingest-light.mjs`, generalizzata da una prima versione specifica
per la sola serie R — stesso pattern già collaudato per gli Agriturismi:
indice scaricato ad ogni esecuzione (economico), schede di dettaglio
scaricate al massimo 8 nuove per esecuzione **per serie** con cache
**permanente** per id (una scheda già scaricata non cambia spesso, non
viene mai ripetuta). 4 job indipendenti in `main()` (uno per serie, via
`TURISMOFVG_BIKE_SERIE`), ciascuno con la propria snapshot Supabase
(`piste-ciclabili-turismofvg-r/p/c/m` — rinominate rispetto alla singola
`piste-ciclabili-turismofvg` della prima versione, nessuna perdita di
dati perché il backfill reale non era ancora partito). Il backfill
completo richiede alcune esecuzioni consecutive per le serie più grandi
(R ~70, P ~40), quasi immediato per le più piccole (C ~18-20, M ~3-5).
Se l'indice di una serie non è disponibile, quella serie riusa l'ultima
snapshot salvata invece di svuotare il proprio riquadro — le altre serie
non ne risentono (job indipendenti).

**Estensione a P/C/M — verifica più leggera della prassi abituale**: a
differenza della serie R (HTML reale incollato dall'utente sia per
l'elenco sia per una scheda), le altre 3 sono state aggiunte solo dopo
aver controllato via WebFetch le rispettive pagine elenco (conteggio
percorsi, codici, presenza di un link di dettaglio) — non l'HTML grezzo
necessario per una verifica selettore-per-selettore. Rischio accettato
esplicitamente dall'utente ("procedere con le altre serie"); il codice
degrada senza rompersi (indice vuoto, snapshot non scritta, warning nei
log, box con "Dati non ancora disponibili") se una pagina risultasse
strutturata diversamente da R. Due scoperte da questa verifica leggera,
già gestite nel codice: (1) i codici non sono tutti "lettera+3 cifre" —
la serie C ha anche forme come "C100"/"CX05"/"C2V1"/"C2V2", quindi
`estraiCodiceRouteTurismoFvgBike()` ora accetta lettera + 2 o più
caratteri alfanumerici; (2) alcune pagine elenco (es. "mountain-bike")
sono categorie **tematiche** che mostrano anche percorsi di altre serie
insieme a quelli della serie nominale (es. la pagina mountain-bike
elenca pure R048/P016/P001 insieme a M001/M003) — filtrati per lettera
iniziale del codice, non per provenienza dalla pagina.

**UI — un riquadro per fonte (28/08/2026, stessa giornata, su richiesta
esplicita dell'utente dopo aver visto la prima versione con due gruppi
dentro un unico Elenco)**: `PisteCiclabiliPage.tsx` carica ora 5
snapshot in parallelo (Regione + le 4 serie) — ciascuna fonte turismofvg
è opzionale singolarmente, la pagina resta utilizzabile con qualunque
sottoinsieme disponibile. 6 riquadri distinti nella griglia: Anelli,
Percorsi lineari, Ciclovie a tappe, Mountain bike (2×2), poi **Regione
FVG a tutta larghezza** (fonte più datata/copertura parziale, mostrata
per ultima come richiesto dall'utente), poi la Mappa a tutta larghezza
in fondo (preferenza "elenco prima della mappa" già stabilita per questo
modulo e per Farmacie). Ricerca unica per nome/codice su tutte le fonti
contemporaneamente. Ogni voce turismofvg mostra codice, difficoltà,
durata, lunghezza, dislivello di salita, comuni attraversati (o "Da X a
Y" quando non è un anello) e un link diretto per scaricare il GPX.
`PisteCiclabiliMap.tsx` generalizzato per accettare tracciati da tutte e
5 le fonti (tipo `TracciatoMappa`, `fonte: "regione"|"r"|"p"|"c"|"m"`,
`chiave` univoca fra fonti per l'evidenziazione al click) — un colore
per fonte, tutti riusati dalla palette esistente già verificata per
contrasto (Regione `cool`, Anelli `warm`, Percorsi lineari `zone.a`,
Ciclovie a tappe `zone.c`/`allerta.gialla`, Mountain bike
`allerta.verde`), evitati apposta i toni rosso/arancio-rosso per non
confondersi con `allerta.rossa` usato per l'evidenziazione al click.

`npx tsc --noEmit` e `node --check scripts/ingest-light.mjs` puliti.
Parsing dell'indice (mapdata + comuni per codice) e della scheda di
dettaglio (JSON-LD) per la serie R verificati con uno script di test a sé
contro frammenti HTML reali (gli stessi ricevuti dall'utente per la
ricognizione) — non ricostruiti a mano. Il nuovo regex del codice e il
filtro per lettera (incluso il caso "pagina tematica mista", simulato con
i dati reali osservati sulla pagina mountain-bike) verificati con uno
script di test a sé sui titoli reali raccolti via WebFetch per le 4
serie. Mappa comune→provincia verificata per conteggio (6 Trieste + 25
Gorizia + 50 Pordenone + 134 Udine = 215, nessun duplicato). **Confermato
dall'utente in produzione che la serie R e la struttura a due fonti
funzionano** (28/08/2026, prima di chiedere l'estensione a P/C/M) — **le
3 nuove serie e la nuova UI a riquadri separati non sono invece ancora
state confermate**: serve un run reale dell'ingestione (4 nuove snapshot
mai scritte finora) e una verifica visiva su `/piste-ciclabili` dopo il
prossimo redeploy.

### Terza fonte — Ciclovie 2020, dato storico (28/08/2026, sessione successiva)

Dopo aver confermato le 5 fonti sopra, l'utente ha scelto di proseguire
la coda Mobilità (vedi "Idee future") con **Ciclovie 2020** (`38yx-qk7a`
su dati.friuliveneziagiulia.it), tra i due dataset rimasti — l'altro,
Rete viaria (76.349 segmenti, 26 campi molto tecnici/GIS), resta
scartato per pesantezza, come già segnalato nella ricognizione del
27/08/2026.

**Verificato su dati reali via WebFetch prima di scrivere codice**
(stesso metodo già usato per "Piste Ciclabili" 7eat-pecq):

- **Dato STORICO, dichiarato esplicitamente**: metadata (`rowsUpdatedAt`)
  ferma al 23/01/2020, oltre 6 anni prima di questa sessione — mostrato
  in UI come layer di contesto ("Ciclovie 2020 · storico"), mai come
  stato attuale della rete.
- **Copertura REGIONALE vera**, a differenza di "Piste Ciclabili" (area
  centrale Udine/Gorizia): bounding box reale verificato
  (`$select=extent(the_geom)`) lon 12.33–13.90/lat 45.58–46.62, l'intero
  FVG compresa Trieste.
- 1174 righe, solo 113 nomi distinti (`$select=count(distinct nome)`) —
  stesso pattern "un percorso è diviso in più segmenti" già visto per
  Piste Ciclabili, qui più marcato (~10 segmenti/nome in media).
- **Il campo nuovo e utile è `stato`** (10 valori osservati via
  `$group=stato`, dal più frequente "realizzato" 641/1174 a "in
  progetto"/"pianificato"/"in costruzione" ecc.) — **uno stesso percorso
  nominato può avere segmenti con stato diverso** (verificato sul dato
  reale: "FVG 6" ha tratti "realizzato" e tratti "percorribile su
  viabilita esistente da migliorare"), quindi niente riduzione a un solo
  stato per percorso: la UI mostra la lunghezza aggregata per stato,
  ordinata dalla più lunga (es. "5,4 km realizzato · 0,6 km in
  progetto").
- `livello` (ambito/regionale/regionale_variante, diverso dall'omonimo
  campo quasi-costante di Piste Ciclabili) mostrato come insieme di
  valori distinti presenti nel percorso.
- `lunghezza` presente per quasi tutte le righe (1173/1174) — a
  differenza di Piste Ciclabili (403/486), la sottostima per lunghezza
  mancante sarà rara qui.
- Campo `progetto` ("si"/"no") **escluso dalla UI**: significato non
  chiaro dalla sola metadata/righe campione, stessa cautela già seguita
  altrove nel progetto per campi ambigui di una fonte non documentata —
  mai un'etichetta inventata.
- Nessun comune/provincia nel dataset — **nessun geocoding aggiunto per
  questa fonte** (scelta esplicita per contenere lo sforzo, trattandosi
  di un layer secondario/di contesto): solo mappa + elenco per nome.
- Nessun bisogno di cache/backfill incrementale: dataset piccolo (1174
  righe) e mai in crescita (fermo dal 2020) — riscaricato per intero ad
  ogni esecuzione, come Piste Ciclabili 7eat-pecq.

**Implementazione**: `ingestCiclovie2020()` in `scripts/ingest-light.mjs`
(nuova snapshot Supabase `piste-ciclabili-2020`), `raggruppaCiclovie2020()`
in `lib/pisteCiclabili.ts` (tipi `SegmentoCiclovia2020`/
`PercorsoCiclovia2020`, con `lunghezzaPerStato: {stato, metri}[]`
ordinato desc — mai un singolo stato scelto arbitrariamente). Sesta fonte
su `/piste-ciclabili`: nuovo riquadro "Ciclovie 2020 · storico" tra
Regione FVG e la Mappa (stesso pattern a riquadro dedicato), nuovo
colore `ink-faint` sulla mappa (nessun colore nuovo inventato — coerente
col trattamento "dato di sfondo/contesto" di questa fonte rispetto alle
altre 5, tutte correnti).

`npx tsc --noEmit` e `node --check scripts/ingest-light.mjs` puliti.
L'aggregazione `lunghezzaPerStato`/`livelli` verificata con uno script di
test a sé (5 casi, incluso una riproduzione esatta di "FVG 6" con stati
misti, un percorso senza alcuna lunghezza nota, e un percorso con livelli
multipli sotto lo stesso nome). **Non ancora testato/confermato in
produzione**: la nuova snapshot non è mai stata scritta da un'esecuzione
reale — da verificare che si popoli e che il riquadro compaia
correttamente su `/piste-ciclabili` dopo il prossimo redeploy.

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

### Fix — riga Meteo per provincia non responsive su iPhone (28/08/2026)

L'utente ha segnalato — con due screenshot reali da un iPhone 16 Pro,
la prima verifica visiva su un telefono vero avuta in tutto questo
progetto per la classe di bug qui sopra — la riga di sintesi per
provincia nel pannello homepage "Meteo · Le 4 province"
(`MeteoOverview` in `components/MeteoPanel.tsx`) che andava a capo in
modo illeggibile, con il link "Dettagli →" schiacciato/tagliato sul
bordo destro dello schermo.

**Causa**: esattamente il bug #1 descritto sopra (flex item con testo a
lunghezza variabile — qui la descrizione del cielo, es. "poco
nuvoloso" — senza `min-w-0`), ma su una riga che l'audit del 24/08/2026
non aveva incluso (copriva `TreniPanel`/`AutobusPanel`/`VoliPanel`/
`BalneazionePanel`, non `MeteoPanel`). Sintomo leggermente diverso
dagli altri casi: qui il testo del cielo non aveva nemmeno `truncate`,
quindi non troncava ma andava a capo, allargando la riga e spingendo
badge temperatura e link "Dettagli →" fuori dallo spazio disponibile.

**Fix**: aggiunto `min-w-0 truncate` alla sola descrizione del cielo
(unico elemento a lunghezza davvero variabile), separato il range di
temperatura min/max in uno `<span>` a sé con `flex-shrink-0
whitespace-nowrap` (non deve mai troncarsi, è il dato più utile della
riga), stessa protezione aggiunta al badge di `TemperaturaBadge.tsx`
(riusato in più pannelli, non solo qui). Il nome provincia non ha più
una larghezza minima fissa su mobile (`flex-shrink-0` invece di
`min-w-[100px]`, quel valore resta solo da `sm:` in su per
l'allineamento fra le 4 righe su schermi più larghi) — non deve mai
troncarsi. La parola "Dettagli" è nascosta sotto `sm:` (resta solo
"→"): l'intera riga è già un link, la parola era un rinforzo visivo
che su un telefono stretto costava più spazio di quanto desse valore —
stessa convenzione già in uso in `AutobusPanel.tsx`/`TreniPanel.tsx`/
`VoliPanel.tsx` per dettagli secondari.

`npx tsc --noEmit` pulito. **Non ancora confermato dall'utente in
produzione** dopo il fix — i due screenshot allegati sono la diagnosi,
non ancora una conferma del fix.

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

- **Strutture ricettive — implementate il 26/08/2026** (vedi sezioni dedicate sopra): hub + 8 pagine, arricchimento contatti da OpenStreetMap lo stesso giorno, poi scraping incrementale turismofvg.it per gli Agriturismi (sempre 26/08/2026, vedi "Agriturismi — scraping incrementale turismofvg.it" sopra per i dettagli — DevTools fornito dall'utente, stesso metodo già servito per Tennis/Sci/Autobus). **Prossimo passo su questo modulo**: estendere lo scraping turismofvg.it alle altre 7 categorie (B&B, Affittacamere, Campeggi, Alberghi Diffusi, Sociali, Marina, Rifugi) — richiede prima di verificare che URL/etichette HTML siano gli stessi osservati per Agriturismi (non garantito), idealmente con un altro campione reale fornito dall'utente per categoria prima di aggiungerla a `TURISMOFVG_CATEGORIE`.
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
