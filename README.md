<<<<<<< HEAD
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
components/     componenti riutilizzabili (Panel, ZoneChip, AlertBanner, TopHeader)
lib/            client Supabase (pronto per la Fase 1)
supabase/       schema.sql del database
.github/        workflow di ingestione schedulata
```

## Prossimo passo

Fase 1 del piano: job di ingestione meteo (OSMER), embedding del Widget Allerta
Protezione Civile, ingestione RSS notizie — e sostituzione dei dati segnaposto in
`app/page.tsx` con letture reali da Supabase.
=======
