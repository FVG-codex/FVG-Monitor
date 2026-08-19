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
| **Qualità dell'aria** (4 province, 4 inquinanti a tab) | 4 dataset Socrata ARPA FVG: PM10 (`qp5k-6pvm`), PM2.5 (`d63p-pqpr`), Ozono (`7vnx-28uy`), NO2 (`ke9b-p6z2`) | Un unico pannello (`AriaQualitaPanel.tsx`) con tab per inquinante — dato giornaliero/orario con qualche giorno di ritardo (validazione ARPA). Match per nome città in `ubicazione` (il campo `rete` esisteva nei dati storici ma non in quelli recenti). Soglie: PM10 50 µg/m³, PM2.5 linea guida OMS 15 µg/m³ 24h (l'Italia ha solo limite annuale), Ozono 120 µg/m³ media mobile 8h, NO2 200 µg/m³ media oraria. Pordenone spesso "n.d." per l'ozono: la stazione storica è dismessa dal 2013-2014 |
| **Calcio** — pagina dedicata `/calcio` | gare.lnd.it (LND Comitato FVG) | App Inertia.js: la pagina incorpora l'intero stato (partite + classifica) in un tag `<script data-page="app">`, estratto con `cheerio` — niente scraping di HTML visibile. 9 campionati (Eccellenza, Promozione, Prima Categoria A/B/C, Seconda Categoria Gorizia/Pordenone/Udine-B/Udine-C — quest'ultima organizzata per provincia invece che su gironi regionali unificati) selezionabili da tab in pagina — vedi `COMPETIZIONI_CALCIO` in `ingest-light.mjs` per aggiungerne altri. Raggiungibile dal menu ad amburger in alto a sinistra. **⚠️ Promemoria annuale**: gli URL hanno `stagione=2025` fisso — a inizio di ogni nuova stagione (di solito settembre) va aggiornato manualmente in `COMPETIZIONI_CALCIO`, altrimenti resta bloccato sull'ultima stagione conclusa |
| **Basket** — pagina dedicata `/basket` | fip.it/risultati (FIP) | A differenza del calcio, qui i dati sono già nell'HTML servito dal server (nessun tag JSON incorporato) — scraping diretto con `cheerio`. **Nota di fragilità aggiuntiva**: l'URL non specifica un girone/comitato esplicito come per il calcio, la pagina mostra un "default" (al momento Trieste, Serie C/Divisione Regionale 1) che potrebbe cambiare lato FIP nel tempo — se i dati smettono di tornare coerenti, verificare se serve un URL più specifico. Estendibile via `COMPETIZIONI_BASKET` in `ingest-light.mjs` |
| **Baseball** — pagina dedicata `/baseball` | live.baseballfvg.it (sito dell'utente, con 2 route API dedicate: `/api/calendario`, `/api/classifiche`) | Fetch semplice, nessuna protezione anti-bot (a differenza del tentativo iniziale con fibs.it direttamente, bloccato con HTTP 403). Le competizioni (Serie A Silver, Serie B Baseball, Serie A2 Softball) vengono scoperte dinamicamente dal calendario filtrato `fvg=true`. Squadre FVG evidenziate in ciano, classifiche raggruppate per girone |
| **Viabilità** | Feed WFS InfoViaggiando | Non è un'API dichiarata pubblica (uso della stessa cautela di ANSA) — filtrato per autostrade FVG + area geografica |
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
singolo timeout fa fallire l'intero job anche se gli altri 20+ moduli sono
andati a buon fine.

## Note di fragilità

I moduli **Eventi** e **Trieste Airport** fanno scraping HTML (non un'API
dichiarata) — dipendono da classi CSS specifiche ispezionate manualmente via
devtools. Se i siti sorgente cambiano veste grafica, i rispettivi
`ingestXxx()` in `scripts/ingest-light.mjs` andranno aggiornati ripetendo lo
stesso procedimento di ispezione.

## Prossimo passo

Fase 4 del piano: rifinitura (responsive, accessibilità, performance),
dominio personalizzato — vedi piano di lavoro per il dettaglio. Oppure altri
moduli extra (Ozono e altri inquinanti dal dataset Socrata ARPA sono stati
individuati ma non ancora implementati).
