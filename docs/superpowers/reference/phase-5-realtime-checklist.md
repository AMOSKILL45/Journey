# Phase 5 — Realtime runtime-contract checklist

> Static tests live in `src/features/realtime/__tests__/contracts.test.ts` (topic↔RLS offset,
> sharing enum↔DB CHECK, `private:true`↔auth migration, i18n parity, generated-types columns).
> The items below are **dashboard / device** contracts no static test can verify — check them
> before relying on live avatars in a real environment.

## Dashboard (Supabase)

- [ ] **Realtime Authorization enforced.** The `20260601110002_realtime_authorization.sql` migration
      adds member-only RLS policies on `realtime.messages`. Confirm the project enforces RLS on
      Realtime (private channels) so `supabase.channel('trip:{id}', { config: { private: true } })`
      is gated. If RLS isn't enforced, presence/positions could leak to non-members; if the project
      blocks private channels entirely, the channel silently fails to subscribe.
- [ ] **Postgres Changes enabled** for `public.milestones` and `public.checkins` (Realtime
      publication) so live check-ins propagate.

## Device (needs a dev client / EAS build — `expo-location` is native)

- [ ] **Two-account presence:** users A and B on the same trip see each other's avatars at their
      current milestone; live check-ins update the path/map without refresh.
- [ ] **Isolation:** a signed-in user who is NOT a member of the trip receives nothing on
      `trip:{id}` (no presence, no positions).
- [ ] **GPS (5B):** with `precise` sharing, A's avatar moves on B's map in ~real time; `city_only`
      rounds to ~0.1°; `paused` / `never` / panic ("Hide me for 1h") fully suppress location.
- [ ] **Permission priming:** the location permission prompt shows the configured copy
      (`expo-location` plugin `locationWhenInUsePermission`).
- [ ] **Offline banner:** killing connectivity shows the offline banner; reconnect re-tracks presence.
