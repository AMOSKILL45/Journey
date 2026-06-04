-- Internal evaluator: param-driven, SECURITY DEFINER, NOT granted to clients.
create or replace function public._evaluate_achievements(p_uid uuid)
returns setof public.user_achievements
language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null then return; end if;
  return query
  with m as (
    select jsonb_build_object(
      'trips_created',            (select count(*) from trips where owner_id = p_uid),
      'milestones_created',       (select count(*) from milestones where created_by = p_uid),
      'checkins',                 (select count(*) from checkins where user_id = p_uid),
      'companions_invited',       (select count(*) from trip_invitations where invited_by = p_uid),
      'documents_uploaded',       (select count(*) from documents where uploaded_by = p_uid),
      'checklist_items_completed',(select count(*) from checklist_item_completions where user_id = p_uid),
      'boss_checkins',            (select count(*) from checkins c
                                     join milestones mi on mi.id = c.milestone_id
                                    where c.user_id = p_uid and mi.is_boss is true),
      'max_trip_members',         (select coalesce(max(cnt),0) from (
                                     select count(*) cnt from trip_members tm2
                                     where tm2.trip_id in (select trip_id from trip_members where user_id = p_uid)
                                     group by tm2.trip_id) s),
      'countries_visited',        (select count(distinct t.destination_country)
                                    from trips t
                                    join trip_members tm on tm.trip_id = t.id and tm.user_id = p_uid
                                    where t.destination_country is not null
                                      and exists (select 1 from checkins c
                                                  join milestones mi on mi.id = c.milestone_id
                                                  where mi.trip_id = t.id and c.user_id = p_uid)),
      'completed_trips',          (select count(*) from trips t
                                    join trip_members tm on tm.trip_id = t.id and tm.user_id = p_uid
                                    where t.end_date is not null and t.end_date < now()
                                      and exists (select 1 from milestones mi where mi.trip_id = t.id)
                                      and not exists (select 1 from milestones mi where mi.trip_id = t.id
                                          and not exists (select 1 from checkins c where c.milestone_id = mi.id))),
      'checklists_completed',     (select count(*) from trip_checklists tc
                                    join trip_members tm on tm.trip_id = tc.trip_id and tm.user_id = p_uid
                                    where exists (select 1 from checklist_items ci where ci.checklist_id = tc.id)
                                      and not exists (
                                        select 1 from checklist_items ci where ci.checklist_id = tc.id
                                        and not (
                                          (ci.scope = 'shared' and ci.is_done is true)
                                          or (ci.scope <> 'shared' and exists (
                                                select 1 from checklist_item_completions cc
                                                where cc.item_id = ci.id and cc.user_id = p_uid))
                                        ))),
      'identity_verified',        (select (is_verified is true or identity_verified_at is not null)
                                    from profiles where id = p_uid)
    ) as metrics
  )
  insert into public.user_achievements (user_id, achievement_id)
  select p_uid, d.id
  from public.achievement_definitions d, m
  where d.is_active
    and (
      (d.trigger_rule->>'type' = 'count'
        and (m.metrics->>(d.trigger_rule->>'metric'))::numeric >= (d.trigger_rule->>'gte')::numeric)
      or
      (d.trigger_rule->>'type' = 'boolean'
        and coalesce((m.metrics->>(d.trigger_rule->>'metric'))::boolean, false)
            = (d.trigger_rule->>'value')::boolean)
    )
    and not exists (select 1 from public.user_achievements ua
                    where ua.user_id = p_uid and ua.achievement_id = d.id)
  on conflict (user_id, achievement_id) do nothing
  returning *;
end $$;
-- Internal evaluator is RPC-internal only: this project auto-grants EXECUTE on new public
-- functions to anon/authenticated, so revoke from those roles too (mirrors prior SECURITY
-- DEFINER migrations) — prevents direct IDOR calls with an arbitrary p_uid.
revoke all on function public._evaluate_achievements(uuid) from public, anon, authenticated;

-- Public wrapper: derives the user from the session (no IDOR), the only client-callable entry.
create or replace function public.evaluate_achievements()
returns setof public.user_achievements
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  return query select * from public._evaluate_achievements(auth.uid());
end $$;
revoke all on function public.evaluate_achievements() from public;
grant execute on function public.evaluate_achievements() to authenticated;
