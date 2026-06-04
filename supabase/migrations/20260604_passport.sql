-- Phase 6B — Adventurer Passport. Per-milestone stamps + countries_visited, persisted on profiles
-- via a check-in trigger (full recompute, idempotent). Backfills existing travelers.
create or replace function public._rebuild_passport(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_stamps jsonb; v_countries text[];
begin
  if p_uid is null then return; end if;
  select coalesce(jsonb_agg(s order by s_at desc), '[]'::jsonb) into v_stamps
  from (
    select distinct on (c.milestone_id)
      jsonb_build_object(
        'milestone_id', c.milestone_id, 'trip_id', m.trip_id,
        'label', m.name, 'country', t.destination_country, 'at', c.checked_in_at
      ) as s,
      c.checked_in_at as s_at
    from checkins c
    join milestones m on m.id = c.milestone_id
    join trips t on t.id = m.trip_id
    where c.user_id = p_uid
    order by c.milestone_id, c.checked_in_at desc
  ) q;
  select coalesce(array_agg(distinct t.destination_country), '{}') into v_countries
  from checkins c
  join milestones m on m.id = c.milestone_id
  join trips t on t.id = m.trip_id
  where c.user_id = p_uid and t.destination_country is not null;
  update profiles set passport_stamps = v_stamps, countries_visited = v_countries where id = p_uid;
end $$;
revoke all on function public._rebuild_passport(uuid) from public, anon, authenticated;

-- Public wrapper: derives auth.uid() (no IDOR), the only client-callable entry.
create or replace function public.rebuild_my_passport()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  perform public._rebuild_passport(auth.uid());
end $$;
revoke all on function public.rebuild_my_passport() from public, anon;
grant execute on function public.rebuild_my_passport() to authenticated;

-- Trigger: every check-in rebuilds that user's passport.
create or replace function public._passport_after_checkins() returns trigger
language plpgsql security definer set search_path = public as
$$ begin perform public._rebuild_passport(new.user_id); return null; end $$;
revoke all on function public._passport_after_checkins() from public, anon, authenticated;

create trigger trg_passport_checkins after insert on public.checkins
  for each row execute function public._passport_after_checkins();

-- Backfill existing travelers.
do $$ declare u uuid; begin
  for u in select distinct user_id from public.checkins loop
    perform public._rebuild_passport(u);
  end loop;
end $$;
