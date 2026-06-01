# Phase 5B — Precise GPS Broadcast (native) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** When a member opts into precise (or city_only) sharing, broadcast their live GPS position over the trip channel (5s/50m throttle) so their avatar moves in real time; back it up to the DB every 60s. Foreground only, v1.0.

**Architecture:** `expo-location` `watchPositionAsync` → `shouldBroadcast` gate → `channel.send({type:'broadcast', event:'position'})`; the channel's `broadcast` listener writes to `presenceStore.positionsByUser`; `LiveAvatarsLayer` prefers a fresh live position over the milestone anchor. `city_only` rounds to ~0.1° before sending. **Native dep (`expo-location`) → requires an EAS build to test on device.**

**Tech Stack:** `expo-location` · Supabase Realtime broadcast · Reanimated lerp · Jest.

**Spec:** `docs/superpowers/specs/2026-06-01-journey-phase-5-realtime-live-avatars-design.md` · **Depends on 5A.**

**Conventions:** identical to 5A. Native dep → after merge, user runs `eas build`; do NOT run builds.

---

## File Structure

- **Migration** `20260601120001_trip_members_last_position.sql` — `last_lat/last_lng/last_position_at`.
- **Feature** `src/features/realtime/`: `utils/geo.ts` (`cityRound`, `haversineMeters`, `shouldBroadcast`), `hooks/useLocationBroadcast.ts`, `api/position.ts` (60s backup write). `__tests__/geo.test.ts`.
- **Modified:** `hooks/useTripChannel.ts` (broadcast listener → store), `components/LiveAvatarsLayer.tsx` (GPS override), `app.json`/`app.config` (expo-location plugin + permission strings), `locales/{en,fr}.json` (permission copy), `package.json`.

---

## Task 1: Add expo-location + config

- [ ] **Step 1:** `npx expo install expo-location` (pins the SDK-54-compatible version).
- [ ] **Step 2:** Add the config plugin + iOS/Android permission strings to `app.json` (or `app.config.*`):

```json
[
  "expo-location",
  {
    "locationAlwaysAndWhenInUsePermission": false,
    "locationWhenInUsePermission": "Journey shows your avatar to your trip companions while you travel together."
  }
]
```

- [ ] **Step 3:** `npm run typecheck`. Commit (`package.json` + lockfile + app config). **Native change → flagged for next EAS build.**

## Task 2: Migration — last-known position

- [ ] **Step 1:** `supabase/migrations/20260601120001_trip_members_last_position.sql`:

```sql
-- Phase 5B: 60s GPS backup so an offline member still shows a last-known dot.
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_position_at timestamptz;
```

- [ ] **Step 2:** Apply via MCP. **Step 3:** Regen types; `npm run typecheck`. **Step 4:** Commit.

## Task 3: Pure geo utils (TDD)

- [ ] **Step 1:** Test `src/features/realtime/__tests__/geo.test.ts`:

```ts
import { cityRound, haversineMeters, shouldBroadcast } from '../utils/geo';

describe('geo', () => {
  it('cityRound rounds to ~0.1 degrees', () => {
    expect(cityRound(48.8566)).toBe(48.9);
    expect(cityRound(2.3522)).toBe(2.4);
  });
  it('haversineMeters ~111m per 0.001 lat degree', () => {
    expect(Math.round(haversineMeters({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 }))).toBe(111);
  });
  it('shouldBroadcast: first fix always sends', () => {
    expect(shouldBroadcast(null, { lat: 0, lng: 0 }, 1000)).toBe(true);
  });
  it('shouldBroadcast: ≥5s elapsed sends', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0, lng: 0 }, 5000)).toBe(true);
  });
  it('shouldBroadcast: ≥50m moved sends', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0.0006, lng: 0 }, 1000)).toBe(true);
  });
  it('shouldBroadcast: still + recent does not send', () => {
    expect(shouldBroadcast({ lat: 0, lng: 0, ts: 0 }, { lat: 0, lng: 0 }, 2000)).toBe(false);
  });
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `src/features/realtime/utils/geo.ts`:

```ts
export interface Pt {
  lat: number;
  lng: number;
}
export interface Stamped extends Pt {
  ts: number;
}

export function cityRound(deg: number): number {
  return Math.round(deg * 10) / 10;
}

const R = 6_371_000;
export function haversineMeters(a: Pt, b: Pt): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MIN_MS = 5_000;
const MIN_M = 50;
export function shouldBroadcast(last: Stamped | null, next: Pt, now: number): boolean {
  if (!last) return true;
  if (now - last.ts >= MIN_MS) return true;
  return haversineMeters(last, next) >= MIN_M;
}
```

- [ ] **Step 4:** Run → PASS. **Step 5:** Commit.

## Task 4: Position backup API + `useLocationBroadcast`

- [ ] **Step 1:** `api/position.ts`: `writeLastPosition(tripId, lat, lng)` → update self `trip_members` row (`last_lat/last_lng/last_position_at=now()`).
- [ ] **Step 2:** `hooks/useLocationBroadcast.ts`: when `enabled` (sharing precise|city_only, not panic) — request permission (pre-priming handled by caller), `Location.watchPositionAsync({accuracy: Balanced, distanceInterval: 25})`; on each fix apply `shouldBroadcast`; send `{type:'broadcast', event:'position', payload:{lat,lng,heading,accuracy,ts}}` (round via `cityRound` when mode==='city_only'); every 60s call `writeLastPosition`. Clean up watcher + on appState background. Accept the channel ref (or topic) from `useTripChannel` — refactor 5A to expose the channel or a `sendPosition` callback.
- [ ] **Step 3:** `npm run typecheck`. **Step 4:** Commit.

## Task 5: Wire broadcast receive + avatar GPS override

- [ ] **Step 1:** In `useTripChannel` (5A), add `.on('broadcast', { event: 'position' }, ({ payload }) => usePresenceStore.getState().setPosition(payload.user_id ?? key, { lat, lng, ts }))`. Include `user_id` in the payload when sending.
- [ ] **Step 2:** In `LiveAvatarsLayer`, prefer `positionsByUser[member.user_id]` (if `ts` within ~30s) over the milestone anchor — project the live lat/lng with the same `projectMilestones`-style math (single point) and render the avatar there; else fall back to milestone anchor.
- [ ] **Step 3:** `npm run typecheck && npm test -- realtime`. **Step 4:** Commit.

## Task 6: Settings + permission priming + i18n

- [ ] **Step 1:** `SharingControls` (5A) already sets `precise`/`city_only`; on selecting those, trigger the pre-permission priming screen then `useLocationBroadcast` enables. Wire `useLocationBroadcast` in `TripDetailScreen` gated on the resolved sharing mode.
- [ ] **Step 2:** i18n `realtime.permission.{title,body,cta}` (en+fr).
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test`. **Step 4:** Commit + push.

## Task 7: Validation

- [ ] **Step 1:** Full suite `npm test`; `get_advisors(security)` clean.
- [ ] **Step 2:** Update CLAUDE.md (Phase 5A+5B). Commit + push.
- [ ] **Step 3:** **On-device:** after an EAS build, verify with two accounts that precise sharing moves the avatar and `never`/panic suppresses it.

---

## Self-Review

- **Spec coverage:** GPS broadcast 5s/50m (T3,4), city_only rounding (T3), 60s backup (T2,4), avatar override (T5), opt-in via settings + permission (T6), native dep flagged (T1). ✔
- **Placeholders:** pure utils have full code; hooks specify exact APIs + the 5A refactor (expose channel/sendPosition).
- **Type consistency:** `Pt`/`Stamped`/`shouldBroadcast`/`cityRound` consistent; `positionsByUser`/`setPosition` match the 5A `presenceStore`.
- **Dependency:** builds on 5A's `useTripChannel`/`presenceStore`/`LiveAvatarsLayer`. Native → EAS build to verify.
