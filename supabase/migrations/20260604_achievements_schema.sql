-- achievement_definitions: read-only catalog (seeded), authenticated read of active rows.
create table if not exists public.achievement_definitions (
  id              text primary key,
  name_key        text not null,
  description_key text not null,
  sprite_id       text not null,
  rarity          text not null check (rarity in ('common','rare','epic','legendary')),
  trigger_rule    jsonb not null,
  sort_order      int  not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
alter table public.achievement_definitions enable row level security;
create policy ad_select_active on public.achievement_definitions
  for select to authenticated using (is_active);

-- user_achievements: per-user unlocks. SELECT own only; NO write policy (RPC-only = anti-cheat).
create table if not exists public.user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id),
  unlocked_at    timestamptz not null default now(),
  trip_id        uuid references public.trips(id) on delete set null,
  primary key (user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
create policy ua_select_own on public.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Realtime: client subscribes to INSERTs on user_achievements (RLS still filters to own rows).
alter publication supabase_realtime add table public.user_achievements;
