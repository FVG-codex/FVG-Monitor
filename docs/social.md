# Social — pubblicazione automatica (dal 18/11/2026)

FVG Monitor pubblica da solo dei **post programmati** su Telegram, Facebook e
Instagram, e manda in privato una **bozza per il canale WhatsApp** da inoltrare a
mano (WhatsApp non ha API ufficiali per i canali).

## Come funziona

| Pezzo | File | Cosa fa |
|---|---|---|
| Contenuto | `lib/social/meteoMattino.tsx` (+ `index.ts`, `comune.ts`, `tipi.ts`) | Legge gli snapshot da Supabase, prepara i testi per ogni piattaforma e disegna la card |
| Testi (JSON) | `GET /api/social/<tipo>?giorno=YYYY-MM-DD` | `pronto: false` se i dati del giorno non ci sono ancora |
| Card (JPEG 1080×1350) | `GET /api/social/<tipo>/immagine` | `&formato=png` per il PNG, `&demo=1` per vederla con dati di esempio |
| Pubblicazione | `scripts/social-publish.mjs` | Orari (`PROGRAMMA`), registro anti-doppioni, invio alle piattaforme, avvisi di errore in privato |
| Pianificazione | `.github/workflows/social.yml` | Ogni 15 minuti tra le 05:05 e le 09:50 UTC |
| Registro | `supabase/social.sql` → tabella `social_post` | Esito per piattaforma; si ritentano solo quelle fallite (max 6 tentativi al giorno) |

Post attivi:

| Tipo | Orario | Contenuto |
|---|---|---|
| `meteo-mattino` | 07:30 (finestra fino alle 10:30) | Previsioni OSMER di oggi, min/max pianura e costa, PM10 di ieri |

La card mostra la sagoma della regione con un'icona meteo sui quattro capoluoghi, su Lignano (zona OSMER A8) e sulle due zone montane: Carnia (A1, Alpi Carniche) e Tarvisiano (A2, Alpi Giulie). I punti sono definiti in `PUNTI_MAPPA`. Le zone montane arrivano dal campo `per_zona` (A1–A9), che l'ingestione salva dal 18/11/2026; finché lo snapshot non è aggiornato si vedono solo i capoluoghi. Le icone sono ricavate dalle descrizioni OSMER di cielo, pioggia e temporale per zona (`classificaIcona()` in `meteoMattino.tsx`, tramite parole chiave). Se il bollettino non ha il dettaglio per zona, la card passa da sola alla versione solo testo.

**Crediti grafici (licenza CC BY 4.0, attribuzione obbligatoria):** sagoma del FVG da `@svg-maps/italy` (VictorCazanave/svg-maps); icone meteo [Twemoji](https://github.com/jdecked/twemoji) (citate sulla card). Entrambe sono incluse in `lib/social/risorseMappa.ts`.

Anteprima della card con dati di esempio: `https://monitor.fvg.it/api/social/meteo-mattino/immagine?demo=1`

## Configurazione (una volta sola)

### 1. Supabase
SQL editor → incolla ed esegui `supabase/social.sql`.

### 2. Telegram
1. Su Telegram apri **@BotFather** → `/newbot` → scegli nome e username → copia il **token**.
2. Crea il **canale** pubblico (es. `@fvgmonitor`) → Amministratori → aggiungi il bot con il permesso "Pubblica messaggi".
3. Scrivi `/start` al tuo bot in privato, poi apri nel browser
   `https://api.telegram.org/bot<TOKEN>/getUpdates` e copia il numero in `"chat":{"id": …}`: è la tua **chat di amministrazione** (anteprime, bozze WhatsApp, errori).

### 3. Meta (Facebook + Instagram)
Prerequisiti: Pagina Facebook di FVG Monitor; account Instagram **professionale** (Business o Creator) collegato alla Pagina.

1. [developers.facebook.com](https://developers.facebook.com) → *Le mie app* → *Crea app* → caso d'uso per la gestione di Pagina e Instagram (tipo **Business**), collegata al tuo portfolio business.
2. Apri **Graph API Explorer**, seleziona l'app → *Generate Access Token* (token utente) con le autorizzazioni:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
3. **Access Token Debugger** → incolla il token → *Extend Access Token* (token utente a lunga durata).
4. Di nuovo nel Graph API Explorer, con il token esteso: `GET me/accounts` → per la tua Pagina copia `id` (**META_PAGE_ID**) e `access_token` (**META_PAGE_TOKEN**). Verificalo nel Debugger: deve risultare *Expires: Never*.
5. `GET <META_PAGE_ID>?fields=instagram_business_account` → l'`id` restituito è **META_IG_USER_ID**.
6. Porta l'app in modalità **Live** (serve l'URL di una pagina privacy). In modalità sviluppo i post potrebbero restare visibili solo a chi ha un ruolo nell'app. Essendo tu l'unico utente, l'accesso "Standard" alle autorizzazioni basta, senza App Review.

### 4. GitHub
Repository → *Settings → Secrets and variables → Actions*.

Secrets (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` esistono già):

| Secret | Valore |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token di BotFather |
| `TELEGRAM_CHANNEL_ID` | `@nomecanale` (o l'id numerico `-100…`) |
| `TELEGRAM_ADMIN_CHAT_ID` | il tuo id di chat privata |
| `META_PAGE_ID` | id della Pagina |
| `META_PAGE_TOKEN` | token della Pagina (non scade) |
| `META_IG_USER_ID` | id dell'account Instagram |

Variables facoltative: `SOCIAL_SITE_URL` (default `https://monitor.fvg.it`), `META_GRAPH_VERSION` (default `v23.0`).

Le piattaforme senza secret vengono saltate: si può partire con il solo Telegram.

## Uso

- **Prova**: *Actions → Social (post programmati) → Run workflow → modo `anteprima`*. Arriva tutto (card + i 4 testi) solo nella tua chat privata.
- **Pubblica subito**: modo `forza` (salta l'orario ma non pubblica due volte lo stesso post nello stesso giorno). Con `piattaforme` = `telegram` si può provarne una sola.
- **Errori**: arrivano in privato su Telegram. Il token Meta scaduto o revocato è segnalato esplicitamente (code 190): va rigenerato dal passo 2.

## Aggiungere un nuovo post programmato
1. `lib/social/<nome>.tsx` che implementa `GeneratoreSocial` (vedi `meteoMattino.tsx`).
2. Registrarlo in `lib/social/index.ts`.
3. Aggiungerlo a `PROGRAMMA` in `scripts/social-publish.mjs` (orario, finestra, piattaforme).
4. Se l'orario è fuori dalla fascia del cron, allargarla in `.github/workflows/social.yml`.
