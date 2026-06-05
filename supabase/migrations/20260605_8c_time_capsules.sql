-- Phase 8C — Time capsules (ADR-004).
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migrations phase_8c_time_capsules +
-- phase_8c_grant_hardening). A capsule's message is invisible until openable (open_after passed OR
-- open_at_milestone reached), enforced by strict RLS; metadata is exposed via list_trip_capsules.
-- is_trip_member / is_trip_editor are the 2-arg (trip_id, user_id) overloads from 4A.

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  author_id uuid not null references auth.users(id),
  recipient_id uuid references auth.users(id),
  message text not null,
  open_after timestamptz,
  open_at_milestone uuid references public.milestones(id) on delete set null,
  opened_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint time_capsules_has_trigger check (open_after is not null or open_at_milestone is not null)
);
create index time_capsules_trip on public.time_capsules (trip_id, created_at desc);
alter table public.time_capsules enable row level security;

-- Openability predicate (single source of truth; search_path pinned per advisor 0011).
create or replace function public._capsule_is_open(p_open_after timestamptz, p_open_at_milestone uuid)
returns boolean language sql stable set search_path = public as $$
  select (p_open_after is not null and now() >= p_open_after)
      or (p_open_at_milestone is not null
          and exists (select 1 from public.checkins c where c.milestone_id = p_open_at_milestone));
$$;

create policy capsules_insert on public.time_capsules for insert
  with check (author_id = auth.uid() and is_trip_member(trip_id, auth.uid()));
create policy capsules_select on public.time_capsules for select
  using (
    is_trip_member(trip_id, auth.uid())
    and (recipient_id is null or recipient_id = auth.uid())
    and public._capsule_is_open(open_after, open_at_milestone)
  );
create policy capsules_delete on public.time_capsules for delete
  using (author_id = auth.uid() or is_trip_editor(trip_id, auth.uid()));

-- Metadata list: message returned ONLY when openable AND caller is recipient/group.
create or replace function public.list_trip_capsules(p_trip_id uuid)
returns table (
  id uuid, author_id uuid, recipient_id uuid, open_after timestamptz,
  open_at_milestone uuid, opened_at timestamptz, created_at timestamptz,
  is_open boolean, message text
) language plpgsql security definer set search_path = public as $$
begin
  if not is_trip_member(p_trip_id, auth.uid()) then
    raise exception 'not a trip member';
  end if;
  return query
    select c.id, c.author_id, c.recipient_id, c.open_after, c.open_at_milestone,
           c.opened_at, c.created_at,
           public._capsule_is_open(c.open_after, c.open_at_milestone) as is_open,
           case when public._capsule_is_open(c.open_after, c.open_at_milestone)
                 and (c.recipient_id is null or c.recipient_id = auth.uid())
                then c.message else null end as message
    from public.time_capsules c
    where c.trip_id = p_trip_id
      and (c.recipient_id is null or c.recipient_id = auth.uid() or c.author_id = auth.uid());
end;
$$;

-- Open: stamp opened_at once, return the message (re-checks all gates).
create or replace function public.open_time_capsule(p_capsule_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c public.time_capsules;
begin
  select * into c from public.time_capsules where id = p_capsule_id;
  if c.id is null then raise exception 'not found'; end if;
  if not is_trip_member(c.trip_id, auth.uid()) then raise exception 'not a member'; end if;
  if not (c.recipient_id is null or c.recipient_id = auth.uid()) then raise exception 'not recipient'; end if;
  if not public._capsule_is_open(c.open_after, c.open_at_milestone) then raise exception 'sealed'; end if;
  if c.opened_at is null then update public.time_capsules set opened_at = now() where id = p_capsule_id; end if;
  return c.message;
end;
$$;

-- Notify when a milestone-anchored capsule becomes openable (mirrors the notifications INSERT shape).
create or replace function public._capsule_after_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, category, title, body, data)
  select coalesce(tc.recipient_id, tm.user_id), 'time_capsule', 'time_capsule', 'time_capsule',
         jsonb_build_object('tripId', tc.trip_id, 'capsuleId', tc.id, 'kind', 'time_capsule')
  from public.time_capsules tc
  join public.trip_members tm on tm.trip_id = tc.trip_id
  where tc.open_at_milestone = new.milestone_id and tc.notified_at is null
    and (tc.recipient_id is null or tc.recipient_id = tm.user_id);
  update public.time_capsules set notified_at = now()
    where open_at_milestone = new.milestone_id and notified_at is null;
  return new;
end;
$$;
create trigger trg_capsule_after_checkin after insert on public.checkins
  for each row execute function public._capsule_after_checkin();

-- Grant hardening (6A lesson): function EXECUTE is implicitly granted to PUBLIC; revoke from PUBLIC,
-- then grant authenticated back to the two real RPCs. Internal helpers stay private.
revoke execute on function public._capsule_is_open(timestamptz, uuid) from public;
revoke execute on function public._capsule_after_checkin() from public;
revoke execute on function public.list_trip_capsules(uuid) from public, anon;
grant execute on function public.list_trip_capsules(uuid) to authenticated;
revoke execute on function public.open_time_capsule(uuid) from public, anon;
grant execute on function public.open_time_capsule(uuid) to authenticated;
