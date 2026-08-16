-- Schema iniziale FVG Monitor
-- Da eseguire nell'SQL editor di Supabase dopo la creazione del progetto
-- (regione consigliata: EU / Francoforte, come da architettura tecnica)

-- Ultimo dato conosciuto per ciascun modulo/zona: è quello che la
-- homepage legge per il rendering (letture veloci, una riga per chiave).
create table if not exists snapshots (
  id text primary key,        -- es. 'meteo:trieste', 'allerte:zona-c'
  module text not null,       -- 'meteo' | 'allerte' | 'notizie' | 'viabilita' | 'trasporti' | 'vento' | 'tgr' | 'eventi'
  zone text,                  -- 'A' | 'B' | 'C' | 'D' | null se non applicabile
  data jsonb not null,        -- payload normalizzato specifico del modulo
  updated_at timestamptz not null default now()
);

-- Storico: ogni job di ingestione vi aggiunge una riga, usato in
-- fasi successive per grafici/andamenti (es. allerte passate, meteo storico).
create table if not exists history (
  id bigserial primary key,
  module text not null,
  zone text,
  data jsonb not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_history_module_time
  on history (module, recorded_at desc);

create index if not exists idx_snapshots_module
  on snapshots (module);

-- Row Level Security: il sito legge queste tabelle tramite la chiave
-- pubblica "anon", quindi va abilitata la sola lettura pubblica.
-- Le scritture avverranno dai job di ingestione con una chiave con
-- privilegi maggiori (service role), che bypassa RLS di default.
alter table snapshots enable row level security;
alter table history enable row level security;

create policy "Lettura pubblica snapshots"
  on snapshots for select
  using (true);

create policy "Lettura pubblica history"
  on history for select
  using (true);
