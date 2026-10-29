create table if not exists ledgers (
  user_id    text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
