# Phase 5 — Realtime + Live Avatars — Design

> Friends see each other live on a trip's map: avatars at the milestone they've reached (presence),
> the path/map updating instantly on check-ins, and — opt-in — real GPS movement.
>
> Date: 2026-06-01 · Status: approved design (Max scope), pre-plan · Lens: architecture / ADRs
> Builds on: trips/`trip_members` (Phase 1), milestones/`checkins` (Phase 2), map (Phase 3),
> Supabase Realtime (in `@supabase/supabase-js`, no new native dep for 5A).

## 1. Context

Master spec §8 (Realtime architecture) + §7.2 (live avatars layer) + §6.8 (30fps lerp gravitation).
The headline promise: "avatars des copains qui gravitent en temps réel."

**Scope (product owner, 2026-06-01):**

1. **Both** position sources: presence/milestone-anchored (base) **and** opt-in precise GPS.
2. **Presence shared with trip members by default**; **precise GPS is opt-in** (sensitive data
   private by default).
3. **Live check-ins** included (map/path update instantly via Postgres Changes).

**Decomposition → two plans:**

- **5A (OTA-shippable)**: realtime channel + authorization, **presence**, **live check-ins**, the
  **live avatars layer** + `PixelAvatar`, privacy/panic settings, reconnect. Realtime ships inside
  `supabase-js` (WebSocket) — **no new native dependency** → OTA-shippable.
- **5B (native)**: **precise GPS** via `expo-location` (5s/50m broadcast + 60s DB backup,
  precise/city_only). `expo-location` is a **native dependency → needs an EAS build** (like 4C push).

```
trip:{tripId}   (Supabase Realtime — PRIVATE channel, authorized by trip membership)
 ├─ Presence   → { user_id, avatar_sprite_id, avatar_color, status, current_milestone_id }   (5A)
 ├─ Broadcast "position" → { lat, lng, heading, accuracy, ts }   (5B, only when sharing=precise|city_only)
 └─ Postgres Changes → checkins / milestones (trip-filtered)   (5A → live path/map)
```

## 2. Architecture Decision Records

| ADR                           | Decision                                                                                                                                                                                                          | Rationale                                                                                | Consequence                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **5-1** Split 5A/5B           | 5A (presence+check-ins+avatars+privacy, OTA) ships first; 5B adds `expo-location` GPS (native, EAS build).                                                                                                        | Realtime is already in `supabase-js`; only GPS is native.                                | 5A ships OTA; 5B batches with a native build. Two plans, shared `realtime/` module.                  |
| **5-2** Presence vs Broadcast | Presence = slow state (avatar/milestone/online, auto join/leave); Broadcast = high-freq ephemeral GPS.                                                                                                            | Matches spec §8.1; presence diffs are cheap, broadcast is fire-and-forget.               | Avatar position comes from presence (5A) or, when sharing precise GPS, from broadcast (5B override). |
| **5-3** Channel authorization | **Private channel** + **Realtime Authorization**: RLS on `realtime.messages` allowing only `is_trip_member(<trip_id>)` to read/send on topic `trip:{id}`. Client subscribes with `{ config: { private: true } }`. | Public channels are joinable by anyone who guesses a `tripId`.                           | A migration adds `realtime.messages` policies; client must pass a fresh access token to Realtime.    |
| **5-4** Privacy default       | Presence shared with members whenever `location_sharing ≠ 'never'`; precise/city_only GPS **opt-in**. Change `trip_members.location_sharing` **default `'precise'` → `'paused'`**. Panic = temp pause.            | "Share by default" (presence) + "GPS opt-in" + private-by-default for exact location.    | One small migration (column default + back-compat).                                                  |
| **5-5** Live check-ins        | Subscribe `postgres_changes` (INSERT on `checkins`, INSERT/UPDATE/DELETE on `milestones`) filtered by `trip_id` → invalidate the existing TanStack Query keys.                                                    | Reuse `milestonesQueryKey`/`tripCheckinsQueryKey`; no bespoke cache patching.            | Path, map, readiness all refresh live.                                                               |
| **5-6** Avatar rendering      | New `PixelAvatar` (sprite + color ring + status badge) + `LiveAvatarsLayer` over the map; reuse `mercator` + `clustering`; 30fps lerp on position change; `prefers-reduced-motion` snaps.                         | Spec §6.8/§7.2; reuse map utils, no new positioning math.                                | Layer is presence-driven (5A); GPS positions override when present (5B).                             |
| **5-7** Reliability           | On reconnect: re-track presence + REST refetch (invalidate queries); "offline" banner; exponential backoff (supabase-js default).                                                                                 | Realtime is not guaranteed delivery (spec §8.5).                                         | A `useRealtimeStatus` exposes connected/offline for the banner.                                      |
| **5-8** State store           | Presence + live positions held in a **Zustand** store keyed by `tripId` (ephemeral, not persisted), selectors per member.                                                                                         | High-frequency updates shouldn't thrash TanStack Query; Zustand is already in the stack. | `presenceStore` is the single source for the avatars layer.                                          |

## 3. Data model (delta)

Realtime presence/broadcast are **ephemeral** (no tables). Only two small migrations:

### 3.1 `trip_members` — privacy default (5A)

```sql
ALTER TABLE public.trip_members ALTER COLUMN location_sharing SET DEFAULT 'paused';
-- existing enum unchanged: 'precise' | 'city_only' | 'paused' | 'never'
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS panic_until timestamptz;
```

Semantics (enforced client-side + in the broadcast gate):

| `location_sharing`     | Presence (avatar+milestone) | GPS broadcast        |
| ---------------------- | --------------------------- | -------------------- |
| `never`                | hidden (appears offline)    | none                 |
| `paused` (**default**) | shared with members         | none                 |
| `city_only`            | shared                      | GPS rounded to ~0.1° |
| `precise`              | shared                      | exact GPS            |

`panic_until > now()` ⇒ treated as `paused` regardless (the "Hide live for 1h" toggle).

### 3.2 `trip_members` — GPS backup (5B)

```sql
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_position_at timestamptz;
```

Backup write every 60s so a member who's offline still shows a last-known dot. RLS already covers
`trip_members` (members read, self writes — verified against existing policies in the plan).

## 4. Channel authorization (ADR 5-3, 5A migration)

Enable Realtime Authorization so a `trip:{id}` private channel is members-only:

```sql
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY; -- (no-op if already enabled by Supabase)

CREATE POLICY "Trip members read trip channel" ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member(substring(realtime.topic() from 6)::uuid, auth.uid())
);
CREATE POLICY "Trip members send on trip channel" ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member(substring(realtime.topic() from 6)::uuid, auth.uid())
);
```

Client: `supabase.channel('trip:'+tripId, { config: { private: true, presence: { key: userId } } })`
and `supabase.realtime.setAuth(accessToken)` on session + token refresh. (Exact policy form validated
against `is_trip_member` signature in the plan; `substring(... from 6)` strips the `trip:` prefix.)

## 5. Presence (5A)

- On entering a trip screen: subscribe `trip:{id}` (private), `channel.track({ user_id,
avatar_sprite_id, avatar_color, status: 'online', current_milestone_id })`.
- `current_milestone_id` = the member's latest `checkin` milestone (derived once + updated on the
  member's own check-ins); null if none.
- `presence` sync/join/leave events → update `presenceStore[tripId]`.
- Respect sharing: if `location_sharing === 'never'` or panic active → don't `track` (appear offline).
- Cleanup: `untrack` + `removeChannel` on unmount / sign-out.

## 6. Live check-ins (5A)

- Two `postgres_changes` listeners on the channel:
  - `milestones` with `filter: 'trip_id=eq.{tripId}'` (INSERT/UPDATE/DELETE) → live milestone CRUD.
  - `checkins` with **no** server filter (`checkins` has no `trip_id` column). Postgres Changes
    respects RLS, so a member only receives check-ins they can already SELECT; the handler invalidates
    only when the changed row's `milestone_id` is in this trip's milestone set (from the `milestones`
    query cache) and ignores the rest.
- Handlers are **debounced** → `queryClient.invalidateQueries` on `milestonesQueryKey(tripId)` /
  `tripCheckinsQueryKey(tripId)`. Path, map, and readiness refresh live without refetch storms.

## 7. Avatar layer / UI (5A)

- **`PixelAvatar`** (`src/features/realtime/components/`): avatar sprite (from `avatar_sprite_id`) +
  color ring (`avatar_color`) + status badge; `accessibilityLabel` (commandment a11y). Sizes sm/md.
- **`LiveAvatarsLayer`**: for each present member (optionally excluding self), compute screen position
  from `current_milestone_id` → milestone lat/lng → `mercator` (reuse map util + camera). Multiple
  avatars on the same node → `clustering` util → `PixelCluster`-style stack. Lerp on position change
  (30fps; snap if `prefers-reduced-motion`).
- Mounted inside `TripMapView` (both overworld + real-map layers).
- **Privacy/panic UI**: per-trip sharing selector (precise/city_only/paused/never) + "Hide live for
  1h" panic toggle; lives on the trip screen and/or trip settings.

## 8. Precise GPS (5B, native)

- Dep: `expo-location` (foreground permission; pre-permission priming screen per spec §6.7).
- When `location_sharing ∈ {precise, city_only}` and not panic: `watchPositionAsync` →
  `shouldBroadcast` (≥5s OR ≥50m since last) → `channel.send({ type: 'broadcast', event: 'position',
payload })`. `city_only` rounds lat/lng to 0.1° before sending.
- Backup: every 60s write `last_lat/last_lng/last_position_at` to `trip_members` (self row).
- `useLocationBroadcast` hook; adaptive throttle (appState background → stop) — kept simple in v1.0.
- Avatar position: live broadcast overrides milestone-presence when fresh (< ~30s), else falls back to
  presence / last-known.

## 9. i18n / Testing / Security

- **i18n**: `realtime.*` (sharing labels, panic, offline banner, permission priming), en + fr, zero
  hardcode.
- **Pure units (testable, no sockets)**: `cityRound` (0.1° rounding), `shouldBroadcast(last, next, lastTs,
now)` (5s/50m), `presenceReduce` (merge presence sync into member map), `avatarScreenPos` (milestone →
  mercator), reuse `clustering`. All Jest-tested.
- **Contract tests**: channel topic format (`trip:{uuid}`), `location_sharing` enum parity (DB ↔ TS ↔
  i18n labels), `realtime.*` i18n key parity en/fr, deep-link/route parity if any.
- **Security**: ADR 5-3 channel authorization is the crux — a non-member must NOT receive presence or
  positions. `get_advisors` after the `realtime.messages` policy migration. Precise GPS strictly
  opt-in; `never`/panic fully suppress. Verify with two test accounts post-build.
- **Reliability**: offline banner; reconnect re-track + refetch.

## 10. Decomposition & implementation outline

- **5A plan** (OTA): channel module + authorization migration; `trip_members` default→paused +
  panic_until migration; types regen; pure utils (TDD); `usePresence` + `presenceStore` +
  `useLiveCheckins` + `useRealtimeStatus`; `PixelAvatar` + `LiveAvatarsLayer` wired into `TripMapView`;
  sharing/panic settings UI; offline banner; `realtime.*` i18n; contract tests; security audit.
- **5B plan** (native): `expo-location` dep + plugin + permission priming; `useLocationBroadcast` +
  `shouldBroadcast`/`cityRound` utils (TDD); 60s backup write + columns migration; precise/city_only
  wiring + avatar GPS override; tests. **Needs EAS build to verify on device.**

## 11. Out of scope (defer)

§8.3 conflict-resolution banners/merge (general collaborative editing — later phase) · non-friend
city_only for v1.1 discovery · "live story" Snap-Map mode (v1.x) · background-location tracking
(foreground only in v1.0).
