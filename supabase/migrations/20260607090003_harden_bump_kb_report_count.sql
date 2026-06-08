-- Grant-harden the KB report-count trigger function: not callable as an RPC by anyone.
-- Revoking from PUBLIC alone leaves Supabase's default anon/authenticated EXECUTE grants
-- (the Phase 6A lesson) — revoke those too. The AFTER INSERT trigger fires regardless of grants.
REVOKE EXECUTE ON FUNCTION public._bump_kb_report_count() FROM PUBLIC, anon, authenticated;
