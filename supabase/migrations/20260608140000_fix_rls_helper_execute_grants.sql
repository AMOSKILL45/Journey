-- P0 OUTAGE FIX (2026-06-08)
-- ----------------------------------------------------------------------------
-- 20260525000003_security_hardening.sql over-revoked EXECUTE on RLS-PREDICATE
-- helper functions from `authenticated`:
--
--   REVOKE EXECUTE ON FUNCTION public.is_trip_member(uuid,uuid) FROM ... authenticated ...
--   REVOKE EXECUTE ON FUNCTION public.is_trip_editor(uuid,uuid) FROM ... authenticated ...
--
-- Its comment ("invoked by triggers/RLS only, not via /rpc") is only true for pure
-- trigger functions (handle_new_user / handle_new_trip). RLS PREDICATE functions are
-- evaluated AS THE CALLING ROLE during policy checks — even when SECURITY DEFINER, the
-- caller still needs EXECUTE to invoke them. With EXECUTE revoked from `authenticated`,
-- every policy that references one throws:
--
--   ERROR: permission denied for function is_trip_member
--   => GET /rest/v1/trips ... 403
--
-- Blast radius (all member-scoped reads/writes 403'd at once): trips, milestones,
-- checkins, documents, checklists (+items/completions/dismissals), photos, polls,
-- poll_votes, reactions, time_capsules, weather_cache, milestone_legs, scrapbooks,
-- trip_members, trip_smart_reminders, realtime.messages, and storage.objects
-- (trip-documents / trip-photos / trip-scrapbooks). Home + Trips + Map all broke.
--
-- Tables that kept working (profiles, notifications, personal_reminders, user_push_tokens)
-- use plain `auth.uid() = user_id` policies with no helper function — which is why the
-- outage looked partial.
--
-- Reactivate EXECUTE for `authenticated` on the four RLS-predicate helpers. We do NOT
-- re-grant `anon`: the primary app flow is authenticated, and keeping anon revoked closes
-- the membership-probe surface. (Anon public-trip viewing via share_token is a separate,
-- deferred decision — see audit follow-ups.)
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_editor(uuid, uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.reaction_target_trip(text, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public._capsule_is_open(timestamptz, uuid)  TO authenticated;
