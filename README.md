# FVG Monitor

Scaffold del progetto — Fase 0 del [piano di lavoro](piano-lavoro-fvg-monitor.md).

Lo stile è portato 1:1 dal [mockup approvato](fvg-monitor-mockup.html): palette Adriatico
notturno, Barlow Condensed + Newsreader + JetBrains Mono, chip di zona A/B/C/D come
elemento firma ricorrente. I dati in homepage sono **segnaposto**: verranno sostituiti
dalle letture da Supabase a partire dalla Fase 1.

## Setup locale

```bash
npm install
cp .env.example .env.local   # poi compila con i valori Supabase (vedi sotto)
npm run dev                  # http://localhost:3000
```

## Cosa resta da fare per completare la Fase 0

Questi passaggi richiedono un account personale (GitHub/Vercel/Supabase) e non
possono essere eseguiti da qui:

1. **Repository Git**
   ```bash
   git init
   git add .
   git commit -m "Fase 0: scaffold iniziale"
   ```
   Crea un repository su GitHub e collegalo (`git remote add origin ...`).

2. **Supabase** — crea un progetto su [supabase.com](https://supabase.com), **regione
   EU (Francoforte)** come da architettura tecnica. Poi:
   - Vai su *SQL Editor* e incolla il contenuto di `supabase/schema.sql`
   - Vai su *Project Settings → API*, copia `URL` e `anon public key` in `.env.local`

3. **Vercel** — importa il repository GitHub su [vercel.com](https://vercel.com).
   Aggiungi le stesse variabili d'ambiente (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) nelle impostazioni del progetto Vercel.
   Il deploy parte automaticamente ad ogni push.

4. **GitHub Actions** — il workflow di prova in
   `.github/workflows/ingest-heavy.yml` si attiva da solo una volta pushato il
   repository (gira ogni 30 minuti, oppure lancialo a mano dalla tab *Actions*
   di GitHub con "Run workflow"). In Fase 2 lo step placeholder verrà
   sostituito dallo script Playwright reale.

## Struttura

```
app/            pagine Next.js (App Router)
  page.tsx        homepage — vista d'insieme delle 4 province
  trieste/        pagina dedicata Trieste
  udine/          pagina dedicata Udine
  gorizia/        pagina dedicata Gorizia
  pordenone/      pagina dedicata Pordenone
components/     componenti riutilizzabili (Panel, ZoneChip, AlertBanner, TopHeader,
                MeteoPanel, ProvinciaPage, HtmlEmbed, ...)
lib/            client Supabase + configurazione condivisa delle 4 province
supabase/       schema.sql del database
scripts/        script di ingestione (meteo, notizie)
.github/        workflow di ingestione schedulata
```

## Fase 1 — dati reali (meteo, notizie, allerte)

Il pannello Meteo e Notizie leggono ora da Supabase invece che da dati segnaposto.
Per completare l'attivazione:

### 1. Secrets GitHub Actions

Nel repository su GitHub: *Settings → Secrets and variables → Actions → New
repository secret*. Aggiungi:

- `SUPABASE_URL` — lo stesso valore di `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` — la chiave **service_role** di Supabase (Project
  Settings → API → Legacy anon, service_role API keys → `service_role` `secret`).
  **Non è la chiave anon**: questa bypassa Row Level Security ed è l'unica
  autorizzata a scrivere. Non va mai in `.env.local` né nel codice del sito.

Il workflow `.github/workflows/ingest-light.yml` gira ogni 15 minuti e popola
`meteo:previsioni` e `notizie:ansa-fvg` nella tabella `snapshots`. Puoi lanciarlo
a mano dalla tab *Actions* → "Ingestion leggera (meteo + notizie)" → "Run workflow"
per un primo popolamento immediato, invece di aspettare i 15 minuti.

### 2. Widget ufficiale meteo ARPA (condizioni "in tempo reale")

I dati OSMER real-time non sono ripubblicabili prima di 24h (vincolo dichiarato
dalla fonte), quindi la temperatura "adesso" non viene ingerita dal nostro job —
solo le previsioni per domani/dopodomani e le osservazioni di ieri. Il sito è ora
strutturato in un'homepage di sintesi + 4 pagine dedicate (`/trieste`, `/udine`,
`/gorizia`, `/pordenone`), quindi servono **4 widget separati**, uno per
capoluogo:

1. Vai su [widget.meteo.fvg.it](https://widget.meteo.fvg.it), configura il widget
   per **Trieste** (formato, colori) e invia la richiesta con la tua email e l'URL del sito
2. Ripeti per **Udine**, **Gorizia** e **Pordenone** (4 richieste separate)
3. Riceverai via email 4 URL di script (es. `widget.meteo.fvg.it/code/.../....js`)
4. Incolla ciascun URL in `components/MeteoWidgetSlot.tsx`, nell'oggetto
   `WIDGET_URL_PER_CITTA`, sostituendo `null` con la stringa dell'URL

**Nota tecnica**: questi script usano `document.write()` per iniettarsi nella
pagina — funziona solo durante il caricamento iniziale di un documento, quindi
li facciamo girare dentro un `<iframe>` isolato (`components/ArpaWidgetEmbed.tsx`),
non incollati direttamente nella pagina React. Non serve nessuna azione da parte
tua oltre a incollare l'URL: la gestione è già pronta. Se il widget appare tagliato
o con troppo spazio vuoto, aggiusta il parametro `height` passato ad
`ArpaWidgetEmbed` in `MeteoWidgetSlot.tsx` (default 210px, pensato per il formato
"h-extended").

### 3. Widget ufficiale allerte Protezione Civile

Stesso discorso del widget meteo: il sito è organizzato per provincia, quindi
servono **4 richieste separate**, una per capoluogo:

1. Vai su [protezionecivile.fvg.it/it/widget-allerta](https://www.protezionecivile.fvg.it/it/widget-allerta)
   e genera il codice per **Trieste**
2. Ripeti per **Udine**, **Gorizia** e **Pordenone**
3. Incolla ciascuno snippet ricevuto in `components/AllertaWidgetSlot.tsx`,
   nell'oggetto `SNIPPET_PER_CITTA`, sostituendo `null` con la stringa ricevuta
   (tra backtick, es. `` `<iframe .../>` ``)

**Attenzione**: se lo snippet ricevuto è anch'esso uno `<script src="...">` (non un
`<iframe>` già pronto), controlla se il file JS collegato usa `document.write()`
come i widget meteo — in tal caso non va incollato con `HtmlEmbed`,
ma gestito con lo stesso pattern a iframe isolato di `ArpaWidgetEmbed.tsx`
(puoi copiarlo e adattarlo, vedi `MeteoWidgetSlot.tsx` per l'esempio). Se invece
è già un `<iframe>` diretto, `HtmlEmbed` va bene
così com'è.

### 4. Nota sul feed notizie ANSA

Il feed RSS di ANSA FVG riporta la dicitura "for personal use only". Il job
ingerisce solo titolo, link e data (mai il testo dell'articolo) con link diretto
all'originale — uno schema di aggregazione standard — ma vale la pena rivalutare
questo punto, eventualmente contattando ANSA, se il progetto dovesse crescere
oltre l'uso personale/dimostrativo.

## Fase 2 — Bora/Vento (fatto)

Il pannello Vento (in homepage e in ciascuna delle 4 pagine provincia) legge
dati reali dall'**API di monitoraggio della Protezione Civile FVG**
(`monitor.protezionecivile.fvg.it/api`, licenza CC BY 4.0, nessuna chiave
richiesta — API pubblica). Il job `ingest:light` ora aggiorna
`vento:trieste`, `vento:udine`, `vento:gorizia`, `vento:pordenone` nella
tabella `snapshots` — nessun secret aggiuntivo necessario.

**Verifica completata**: tutte e 4 le stazioni sono confermate funzionanti con dati
reali — Trieste (212), Udine S+M (558), Gorizia aeroporto (65), Pordenone meteo
(131). Nota: la stazione "Pordenone S+M" (567) ha il sensore vento configurato ma
non restituiva misure recenti al momento della verifica — sostituita con
"Pordenone meteo" (131), che invece funziona.

## Prossimo passo

Fase 2 del piano, parte restante: trasporto pubblico (TPL FVG) — **abbandonato
per decisione** (nessun endpoint pubblico per il tracciamento GPS in tempo
reale trovato via devtools/WebSocket; trovato solo l'elenco statico delle
fermate, ritenuto di scarso interesse per il progetto).

## Fase 2 — Viabilità (fatto)

Sorpresa positiva: InfoViaggiando espone un feed **WFS pubblico** (standard
GIS) dietro la propria mappa — niente scraping via browser headless
necessario, si legge come le altre API. Endpoint:
`infoviaggiando.it/WFS/?service=WFS&request=GetFeature&...&typename=PortaleWeb:EVENTI_LINEARI`.

Il feed copre una rete molto più ampia del FVG (fino a Brescia/Padova) —
`ingestViabilita()` filtra per autostrade rilevanti (A4, A23, A28, A34) **e**
per area geografica (bounding box approssimativo del FVG), altrimenti si
vedrebbero eventi di altre regioni.

**Nota sulla fonte**: non è documentata come API pubblica ufficiale (è quella
usata internamente dalla loro mappa) — trattata con la stessa cautela di ANSA:
solo dati essenziali, da rivalutare se il progetto cresce oltre l'uso
dimostrativo.

## Fase 3 — TGR ed Eventi (fatto)

**TGR**: nessun feed/RSS pubblico trovato (verificato più volte) — resta un
link statico alla sezione ufficiale (`components/TgrCard.tsx`), nessuna
ingestione automatica, come deciso nel piano di lavoro.

**Eventi**: `ingestEventi()` fa scraping HTML della pagina eventi di
turismofvg.it (portale ufficiale PromoTurismoFVG). La pagina è renderizzata
server-side (un semplice fetch restituisce già tutti gli eventi, verificato),
quindi niente browser headless necessario — parsing con `cheerio` sulla
struttura HTML reale, ispezionata manualmente via devtools.

**Nota di fragilità**: essendo scraping HTML (non un'API dichiarata), il
parser si basa su classi CSS specifiche (`c-eventsResults__item`, `info_date`,
`item_title`, ecc.) che potrebbero cambiare se il sito viene ridisegnato — in
quel caso `ingestEventi()` in `scripts/ingest-light.mjs` andrà aggiornato
seguendo lo stesso procedimento di ispezione HTML usato per costruirlo.

## Prossimo passo

Fase 4 del piano: rifinitura (responsive, accessibilità, performance,
dominio personalizzato) — vedi piano di lavoro per il dettaglio.

## Fase 3 — Qualità dell'aria (fatto)

`ingestQualitaAria()` legge il dataset **"Aria - Particelle Sospese PM10"**
(id `qp5k-6pvm`) dal portale open data regionale (Socrata,
`dati.friuliveneziagiulia.it`) — dato giornaliero (non orario, coerente col
processo di validazione ARPA), con qualche giorno di ritardo rispetto a
oggi: normale, non un errore. Come per il vento, la stazione di ciascuna
provincia viene cercata dinamicamente per nome (contiene "Trieste"/"Udine"/
ecc.) invece di un ID fisso, per resilienza.

Soglia di legge: 50 µg/m³ media giornaliera — il pannello colora il valore
in verde/rosso di conseguenza.

**Fase 3 completa**: TGR, Eventi, Qualità dell'aria — tutti i moduli
previsti dal concept iniziale sono ora coperti.
