# Phase 7 — Runtime Contracts Checklist

> Contracts whose other side lives **outside the repo** (Supabase project
> `ewsoupkfkachxidmuwoi` dashboard / deployed functions). The in-repo side is guarded by
> automated contract tests (per-feature `__tests__/contracts.test.ts` +
> `src/__tests__/internal-routes-audit.test.ts`). This file makes the external dependencies
> visible so they don't drift silently. Verified 2026-06-05.

## Edge functions (must stay deployed + `verify_jwt=true`)

Client-triggered, authorize the caller via forwarded JWT (`auth.getUser`) + `trip_members`
membership before any service-role work. **Not** cron/secret-gated (a client `functions.invoke`
cannot supply `x-webhook-secret`).

- [x] `enrich_milestone` — ACTIVE, `verify_jwt=true`. Invoked by `triggerEnrich` (7C). Open-Meteo
  - OSRM → `weather_cache` / `milestone_legs`. Contract: `enrichment/__tests__/contracts.test.ts`.
- [x] `generate_scrapbook` — ACTIVE, `verify_jwt=true`. Invoked by `generateScrapbook` (7E).
      pdf-lib PDF → `trip-scrapbooks`, inserts `scrapbooks`. Contract:
      `scrapbook/__tests__/contracts.test.ts`.

No Vault secret required (JWT model). If either is redeployed, keep `verify_jwt=true`.

## Storage buckets (private + path-scoped policies)

Path convention `<trip_id>/<file>`; policies use `is_trip_member/_editor((split_part(name,'/',1))::uuid, auth.uid())`.

- [x] `trip-photos` — private. read=member, write/delete=editor. (7A)
- [x] `trip-scrapbooks` — private. read=member, write(PNG upload)=editor; PDF written by edge fn.
      (7E)

## Migrations applied to prod (mirrored on disk)

- [x] `20260605_7a_photos_reactions.sql` — photos, reactions, `reaction_target_trip()` (revoked
      from PUBLIC), `trip-photos` bucket.
- [x] `20260605_7b_polls.sql` — polls, poll_votes, realtime publication.
- [x] `20260605_7c_enrichment.sql` — weather_cache, milestone_legs (no client-write policy).
- [x] `20260605_7e_scrapbook.sql` — scrapbooks (no client-INSERT), `trip-scrapbooks` bucket.

Generated types (`src/core/supabase/types.ts`) regenerated to include all 7 tables.

## Realtime publications

- [x] `reactions` (live reaction counts, 7A) and `poll_votes` (live results, 7B) added to
      `supabase_realtime`.

## Advisors (2026-06-05, post-Phase-7)

- Security: **no new findings.** `reaction_target_trip` locked down (PUBLIC revoke). Remaining =
  pre-existing baseline (PostGIS `spatial_ref_sys`/`st_estimatedextent`, `pg_net`, intentional
  `evaluate_achievements`/`rebuild_my_passport` RPCs, auth leaked-password config).
- Performance: Phase 7 tables show the same `auth_rls_initplan` (un-wrapped `auth.uid()`) +
  `unindexed_foreign_keys` patterns as every existing table — baseline-consistent, not new.
  A DB-wide `(select auth.uid())` RLS optimization remains a separate, future task.

## Needs a device (EAS build) to verify end-to-end

OTA ships the JS, but these exercise native modules / live backends only on a real build:

- [ ] Photo capture/upload (expo-image-picker/-manipulator) → `trip-photos` round-trip + reactions.
- [ ] `enrich_milestone` populates weather/distance on a real multi-milestone trip.
- [ ] `generate_scrapbook` PDF (pdf-lib + photo embedding) under the 30 s budget.
- [ ] `.ics` export share sheet (expo-sharing).
