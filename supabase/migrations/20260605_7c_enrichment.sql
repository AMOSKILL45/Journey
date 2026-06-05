-- Phase 7C — Distance + Weather (enrichment caches)
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_7c_enrichment).
-- Cache tables are NOT client-writable (no insert/update/delete policy); the enrich_milestone
-- edge function writes them with the service role (bypasses RLS). is_trip_member is the 2-arg overload.

create table public.weather_cache (
  milestone_id uuid primary key references public.milestones(id) on delete cascade,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.milestone_legs (
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_milestone_id uuid not null references public.milestones(id) on delete cascade,
  to_milestone_id uuid not null references public.milestones(id) on delete cascade,
  distance_m int not null,
  duration_s int not null,
  mode text not null default 'driving',
  computed_at timestamptz not null default now(),
  primary key (from_milestone_id, to_milestone_id)
);
create index legs_trip on public.milestone_legs (trip_id);
alter table public.weather_cache enable row level security;
alter table public.milestone_legs enable row level security;
create policy weather_select on public.weather_cache for select using (is_trip_member((select trip_id from public.milestones where id = milestone_id), auth.uid()));
create policy legs_select on public.milestone_legs for select using (is_trip_member(trip_id, auth.uid()));
