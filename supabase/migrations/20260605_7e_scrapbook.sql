-- Phase 7E — Trip Scrapbook (ADR-003).
-- On-demand recap: a client-rendered Skia PNG "story" card + a server-composed PDF album live
-- in the private `trip-scrapbooks` bucket. The `scrapbooks` table records each generation.
-- Rows are inserted by the `generate_scrapbook` edge function (service role) only — there is
-- intentionally NO client-INSERT policy (anti-tamper; mirrors the cache tables).

create table if not exists public.scrapbooks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  png_path text,
  pdf_path text,
  stats jsonb not null default '{}',
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now()
);

create index if not exists scrapbooks_trip on public.scrapbooks(trip_id, generated_at desc);

alter table public.scrapbooks enable row level security;

-- Members can read their trip's scrapbooks.
create policy scrapbooks_select on public.scrapbooks
  for select using (public.is_trip_member(trip_id, auth.uid()));
-- INSERT/UPDATE/DELETE only via the edge function (service role). No client write policy.

-- Private bucket for both the PNG story cards and the PDF albums.
insert into storage.buckets (id, name, public)
values ('trip-scrapbooks', 'trip-scrapbooks', false)
on conflict (id) do nothing;

-- Members read; editors write. Path convention: <trip_id>/<uuid>.<ext>.
create policy "trip-scrapbooks read" on storage.objects
  for select using (
    bucket_id = 'trip-scrapbooks'
    and public.is_trip_member((split_part(name, '/', 1))::uuid, auth.uid())
  );
create policy "trip-scrapbooks write" on storage.objects
  for insert with check (
    bucket_id = 'trip-scrapbooks'
    and public.is_trip_editor((split_part(name, '/', 1))::uuid, auth.uid())
  );
