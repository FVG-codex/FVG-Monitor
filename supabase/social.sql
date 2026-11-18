-- Modulo "Social" (18/11/2026) — registro delle pubblicazioni automatiche
-- sui social di FVG Monitor (Telegram, Facebook, Instagram + bozza
-- WhatsApp inviata in privato). Da eseguire UNA VOLTA nell'SQL editor di
-- Supabase. Vedi scripts/social-publish.mjs e docs/social.md.
--
-- Una riga per ogni post programmato e per giorno, es.
-- id = 'meteo-mattino:2026-11-18'. Serve a due cose:
--   1. non pubblicare mai due volte lo stesso post (il workflow gira ogni
--      15 minuti e può ripartire dopo un errore);
--   2. ritentare SOLO le piattaforme fallite: l'esito di ciascuna è
--      salvato in `esiti` (es. Telegram ok, Instagram in errore → al giro
--      successivo si riprova solo Instagram).

create table if not exists social_post (
  id text primary key,                 -- '<tipo>:<YYYY-MM-DD>'
  tipo text not null,                  -- es. 'meteo-mattino'
  giorno date not null,                -- giorno locale (Europe/Rome)
  stato text not null default 'in_corso', -- 'in_corso' | 'pubblicato' | 'parziale' | 'errore'
  tentativi int not null default 0,
  esiti jsonb not null default '{}'::jsonb, -- { telegram: { ok, id?, errore? }, facebook: {...}, ... }
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index if not exists idx_social_post_tipo_giorno
  on social_post (tipo, giorno desc);

-- RLS attiva SENZA alcuna policy: nessun accesso con la chiave pubblica
-- "anon" del sito. Solo lo script di pubblicazione (service role, che
-- bypassa la RLS) legge e scrive questa tabella.
alter table social_post enable row level security;
