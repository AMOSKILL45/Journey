-- Phase 7A — Photos + Reactions
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migrations
-- phase_7a_photos_reactions + phase_7a_revoke_reaction_target_trip_public).
-- Helpers is_trip_member / is_trip_editor are the 2-arg (trip_id, user_id) overloads from 4A.

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  width int,
  height int,
  size_bytes int not null default 0,
  created_at timestamptz not null default now()
);
create index photos_trip_created on public.photos (trip_id, created_at desc);
create index photos_milestone on public.photos (milestone_id);
alter table public.photos enable row level security;
create policy photos_select on public.photos for select using (is_trip_member(trip_id, auth.uid()));
create policy photos_insert on public.photos for insert with check (is_trip_editor(trip_id, auth.uid()) and user_id = auth.uid());
create policy photos_update on public.photos for update using (user_id = auth.uid() or is_trip_editor(trip_id, auth.uid()));
create policy photos_delete on public.photos for delete using (user_id = auth.uid() or is_trip_editor(trip_id, auth.uid()));

-- resolve a reaction target to its trip for membership checks
create or replace function public.reaction_target_trip(p_type text, p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case p_type
    when 'photo' then (select trip_id from public.photos where id = p_id)
    when 'milestone' then (select trip_id from public.milestones where id = p_id)
    when 'checkin' then (select m.trip_id from public.checkins c join public.milestones m on m.id = c.milestone_id where c.id = p_id)
  end
$$;
-- SQL functions are granted EXECUTE to PUBLIC by default; anon/authenticated inherit it.
-- Revoke from PUBLIC so only RLS policies (run as owner) can call this internal helper.
revoke execute on function public.reaction_target_trip(text, uuid) from public, anon, authenticated;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('photo', 'milestone', 'checkin')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('heart', 'fire', 'laugh', 'wow', 'clap', 'star')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, emoji)
);
alter table public.reactions enable row level security;
create policy reactions_select on public.reactions for select using (is_trip_member(reaction_target_trip(target_type, target_id), auth.uid()));
create policy reactions_insert on public.reactions for insert with check (user_id = auth.uid() and is_trip_member(reaction_target_trip(target_type, target_id), auth.uid()));
create policy reactions_delete on public.reactions for delete using (user_id = auth.uid());
alter publication supabase_realtime add table public.reactions;

-- private bucket + path-scoped policies (mirror trip-documents from 4A; path is '<trip_id>/<file>')
insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', false) on conflict (id) do nothing;
create policy "trip-photos read" on storage.objects for select using (bucket_id = 'trip-photos' and is_trip_member((split_part(name, '/', 1))::uuid, auth.uid()));
create policy "trip-photos write" on storage.objects for insert with check (bucket_id = 'trip-photos' and is_trip_editor((split_part(name, '/', 1))::uuid, auth.uid()));
create policy "trip-photos delete" on storage.objects for delete using (bucket_id = 'trip-photos' and is_trip_editor((split_part(name, '/', 1))::uuid, auth.uid()));
