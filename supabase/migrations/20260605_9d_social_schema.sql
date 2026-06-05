-- Phase 9D — v1.1 social foundation schema (empty tables + RLS, no UI).
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_9d_social_schema).
-- These tables are prepared for v1.1 (discovery/join/reports/blocks) — no client code in v1.0.

create table public.trip_join_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  message text, proposed_segment_start date, proposed_segment_end date,
  proposed_milestones uuid[], status text not null default 'pending',
  responded_at timestamptz, responded_by uuid references auth.users(id),
  response_message text, contact_exchanged_at timestamptz,
  match_score int, expires_at timestamptz, created_at timestamptz not null default now()
);
create index trip_join_requests_trip on public.trip_join_requests (trip_id);
alter table public.trip_join_requests enable row level security;
create policy jr_insert on public.trip_join_requests for insert
  with check (requester_id = auth.uid());
create policy jr_select on public.trip_join_requests for select
  using (requester_id = auth.uid()
         or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy jr_update on public.trip_join_requests for update
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null, target_id uuid not null, reason text not null,
  details text, status text not null default 'pending',
  resolved_at timestamptz, resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select using (reporter_id = auth.uid());

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text, created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
create policy blocks_all on public.user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create table public.trip_discovery_index (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  geo_bbox geography(Polygon, 4326), date_range tstzrange, countries text[]
);
alter table public.trip_discovery_index enable row level security;
-- Discoverable trips only; writes are service-role only (no client INSERT/UPDATE policy).
create policy discovery_select on public.trip_discovery_index for select
  using (exists (select 1 from public.trips t where t.id = trip_id
                 and t.visibility = any(array['public_view','open_to_join'])));
