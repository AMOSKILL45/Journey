-- Phase 9A — public-read of a non-private trip's path (ADR-008 allowlist: milestones only).
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_9a_milestones_public).
-- OR'd with the existing members-only SELECT policy: members still read their private trips'
-- milestones, AND any authenticated user reads a non-private trip's milestones. No other child
-- table is exposed.

create policy milestones_public_select on public.milestones for select
  using (exists (select 1 from public.trips t
                 where t.id = milestones.trip_id and t.visibility <> 'private'));
