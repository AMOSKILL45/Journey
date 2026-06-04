-- Security hardening (advisors 0028/0029). Supabase's default privileges grant EXECUTE on
-- new public functions to anon + authenticated EXPLICITLY, so "revoke ... from public" in the
-- triggers migration did not remove their access. Internal trigger functions must never be
-- callable via PostgREST RPC — revoke from every client role (trigger execution is unaffected,
-- it runs as the function owner regardless of caller EXECUTE privilege).
revoke execute on function public._ach_after_checkins() from anon, authenticated, public;
revoke execute on function public._ach_after_milestones() from anon, authenticated, public;
revoke execute on function public._ach_after_trips() from anon, authenticated, public;
revoke execute on function public._ach_after_invitations() from anon, authenticated, public;
revoke execute on function public._ach_after_documents() from anon, authenticated, public;
revoke execute on function public._ach_after_completions() from anon, authenticated, public;
revoke execute on function public._ach_after_members() from anon, authenticated, public;

-- evaluate_achievements() is the client entry point: authenticated keeps EXECUTE, anon does not.
revoke execute on function public.evaluate_achievements() from anon, public;
grant execute on function public.evaluate_achievements() to authenticated;
