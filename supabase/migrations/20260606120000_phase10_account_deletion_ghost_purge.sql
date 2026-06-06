-- Phase 10 (10E) — account deletion. ADR-010.
-- Reserved "ghost" user owns anonymized shared content; purge_account_data runs the ordered
-- delete/anonymize/transfer policy BEFORE the edge fn calls auth.admin.deleteUser.
-- Applied via Supabase MCP on 2026-06-06 (project ewsoupkfkachxidmuwoi).

-- 1) Reserved ghost user (anonymization sentinel). Trigger handle_new_user creates its profile.
insert into auth.users (id, email, raw_user_meta_data)
values ('de1e7e00-0000-4000-8000-000000000000', 'deleted@journey.internal',
        '{"display_name":"Former traveller"}'::jsonb)
on conflict (id) do nothing;

-- belt-and-suspenders: ensure ghost profile exists even if the trigger is ever disabled
insert into public.profiles (id, display_name)
values ('de1e7e00-0000-4000-8000-000000000000', 'Former traveller')
on conflict (id) do nothing;

-- 2) Ordered purge routine — service-role only, called by the delete-account edge fn.
create or replace function public.purge_account_data(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ghost constant uuid := 'de1e7e00-0000-4000-8000-000000000000';
begin
  if p_uid is null or p_uid = ghost then
    raise exception 'purge_account_data: invalid target';
  end if;

  -- (1) ANONYMIZE shared content -> ghost (NOT NULL author cols cannot be nulled)
  update milestones      set created_by = ghost where created_by = p_uid;
  update checkins        set user_id    = ghost where user_id    = p_uid;
  update photos          set user_id    = ghost where user_id    = p_uid;
  update polls           set created_by = ghost where created_by = p_uid;
  update time_capsules   set author_id  = ghost where author_id  = p_uid;
  update trip_checklists set created_by = ghost where created_by = p_uid;
  update checklist_items set created_by = ghost where created_by = p_uid;

  -- (2) SET NULL nullable references (detach without deleting the host row)
  update checklist_items     set assigned_to  = null where assigned_to  = p_uid;
  update checklist_items     set done_by       = null where done_by       = p_uid;
  update checklist_templates set created_by    = null where created_by    = p_uid;
  update trip_invitations    set accepted_by   = null where accepted_by   = p_uid;
  update time_capsules       set recipient_id  = null where recipient_id  = p_uid;
  update reports             set resolved_by   = null where resolved_by   = p_uid;
  update trip_join_requests  set responded_by  = null where responded_by  = p_uid;

  -- (3) TRANSFER owned shared trips -> oldest other member; DELETE solo-owned trips
  update trips t
     set owner_id = (
       select tm.user_id from trip_members tm
        where tm.trip_id = t.id and tm.user_id <> p_uid
        order by tm.joined_at asc nulls last, tm.user_id asc
        limit 1)
   where t.owner_id = p_uid
     and exists (select 1 from trip_members tm2
                  where tm2.trip_id = t.id and tm2.user_id <> p_uid);
  delete from trips where owner_id = p_uid;  -- remaining = sole-member trips

  -- (4) DELETE personal rows (NO ACTION FKs MUST be explicit; CASCADE ones harmless to repeat)
  delete from documents                       where uploaded_by  = p_uid;  -- storage objects: edge fn
  delete from checklist_item_completions      where user_id      = p_uid;
  delete from checklist_suggestion_dismissals where dismissed_by = p_uid;
  delete from scrapbooks                      where generated_by = p_uid;
  delete from trip_smart_reminders            where user_id      = p_uid;
  delete from personal_reminders              where user_id      = p_uid;
  delete from notifications                   where user_id      = p_uid;
  delete from poll_votes                      where user_id      = p_uid;
  delete from reactions                       where user_id      = p_uid;
  delete from user_achievements               where user_id      = p_uid;
  delete from user_push_tokens                where user_id      = p_uid;

  -- (5) Detach memberships + sent invitations (CASCADE on profile delete; explicit for clarity)
  delete from trip_members     where user_id    = p_uid;
  delete from trip_invitations where invited_by = p_uid;

  -- profiles + auth.users removed by auth.admin.deleteUser(p_uid) AFTER this routine;
  -- its CASCADE FKs finish v1.1 reporter/blocker/requester rows.
end;
$$;

-- grant-hardening: revoke from PUBLIC (the implicit grant), anon, authenticated (ADR-010 / 6A lesson)
revoke all privileges on function public.purge_account_data(uuid) from public, anon, authenticated;
