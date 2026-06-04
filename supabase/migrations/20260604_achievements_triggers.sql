-- helper macro pattern: each fn perform-calls the evaluator for the row's user, returns null (AFTER).
create or replace function public._ach_after_checkins() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;
create or replace function public._ach_after_milestones() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.created_by); return null; end $$;
create or replace function public._ach_after_trips() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.owner_id); return null; end $$;
create or replace function public._ach_after_invitations() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.invited_by); return null; end $$;
create or replace function public._ach_after_documents() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.uploaded_by); return null; end $$;
create or replace function public._ach_after_completions() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;
create or replace function public._ach_after_members() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;

revoke all on function public._ach_after_checkins() from public;
revoke all on function public._ach_after_milestones() from public;
revoke all on function public._ach_after_trips() from public;
revoke all on function public._ach_after_invitations() from public;
revoke all on function public._ach_after_documents() from public;
revoke all on function public._ach_after_completions() from public;
revoke all on function public._ach_after_members() from public;

create trigger trg_ach_checkins    after insert on public.checkins
  for each row execute function public._ach_after_checkins();
create trigger trg_ach_milestones  after insert on public.milestones
  for each row execute function public._ach_after_milestones();
create trigger trg_ach_trips       after insert on public.trips
  for each row execute function public._ach_after_trips();
create trigger trg_ach_invitations after insert on public.trip_invitations
  for each row execute function public._ach_after_invitations();
create trigger trg_ach_documents   after insert on public.documents
  for each row execute function public._ach_after_documents();
create trigger trg_ach_completions after insert on public.checklist_item_completions
  for each row execute function public._ach_after_completions();
create trigger trg_ach_members     after insert on public.trip_members
  for each row execute function public._ach_after_members();
