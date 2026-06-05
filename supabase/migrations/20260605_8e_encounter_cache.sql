-- Phase 8E — Encounter cache (ADR-006).
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_8e_encounter_cache).
-- Service-role only: the random_encounter edge fn reads/writes it; clients reach encounters through
-- the edge fn and never touch this table directly (mirrors weather_cache / milestone_legs).

create table public.encounter_cache (
  cache_key text primary key,                 -- rounded "lat,lng,radius" bucket
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.encounter_cache enable row level security;
-- No client policies (RLS enabled + no policy = deny-all to anon/authenticated).
revoke all on public.encounter_cache from anon, authenticated;
