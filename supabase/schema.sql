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
