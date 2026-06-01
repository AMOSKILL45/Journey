# Phase 5A — Realtime Presence + Live Check-ins + Avatars (OTA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Trip members see each other's avatars (anchored at the milestone they've reached) live on the map, with the path/map updating instantly on check-ins — all over a membership-authorized Supabase Realtime channel. No new native dependency → OTA-shippable.

**Architecture:** A private `trip:{id}` channel (Realtime Authorization via RLS on `realtime.messages`). Presence carries `{user_id, avatar_sprite_id, avatar_color, status, current_milestone_id}` into a Zustand `presenceStore`; `LiveAvatarsLayer` renders `PixelAvatar`s inside `OverworldLayer` (reusing its mercator projection + the `clustering` util). `postgres_changes` on `milestones`/`checkins` invalidate existing TanStack Query keys.

**Tech Stack:** Supabase Realtime (in `@supabase/supabase-js`) · Zustand v5 · TanStack Query v5 · React Native SVG/Reanimated · Jest + RNTL.

**Spec:** `docs/superpowers/specs/2026-06-01-journey-phase-5-realtime-live-avatars-design.md`

**Conventions:** migrations via Supabase MCP `apply_migration` (server `472a285c…`, project `ewsoupkfkachxidmuwoi`; prod DDL ok per user "go"); regen types via MCP; RLS reuses `public.is_trip_member`; i18n `locales/{en,fr}.json`; validate inline `npm run typecheck && npm run lint && npm test`.

---

## File Structure

**Migrations**

- `20260601110001_trip_members_sharing_default.sql` — default `paused` + `panic_until`.
- `20260601110002_realtime_authorization.sql` — RLS on `realtime.messages` for `trip:` topics.

**Feature `src/features/realtime/`**

- `utils/channel.ts` — `tripTopic(tripId)`, `presenceReduce(state)`.
- `utils/projectMilestones.ts` — pure projection (extracted from OverworldLayer), reused by avatars.
- `store/presenceStore.ts` — Zustand store (members by tripId).
- `api/sharing.ts` — read/update `location_sharing` + `panic_until` on `trip_members`.
- `hooks/useTripChannel.ts` — subscribe/track/cleanup + presence + postgres_changes + status.
- `hooks/useLocationSharing.ts` — TanStack query/mutation over `api/sharing`.
- `components/PixelAvatar.tsx` · `components/LiveAvatarsLayer.tsx` · `components/SharingControls.tsx` · `components/OfflineBanner.tsx`.
- `index.ts` barrel · `__tests__/` (channel, projectMilestones, presenceReduce, PixelAvatar, contracts).

**Modified**

- `src/features/map/components/OverworldLayer.tsx` — use `projectMilestones`; accept + render `liveMembers`.
- `src/features/map/components/MapCrossfade.tsx` + `TripMapView.tsx` — thread `liveMembers` prop.
- `src/features/trips/screens/TripDetailScreen.tsx` — `useTripChannel(tripId)` + OfflineBanner + SharingControls.
- `src/core/i18n/locales/{en,fr}.json` — `realtime.*`.

---

## Task 1: Migration — sharing default + panic

- [ ] **Step 1:** Create `supabase/migrations/20260601110001_trip_members_sharing_default.sql`:

```sql
-- Phase 5A: presence shared by default, precise GPS opt-in. Panic toggle.
ALTER TABLE public.trip_members ALTER COLUMN location_sharing SET DEFAULT 'paused';
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS panic_until timestamptz;
```

- [ ] **Step 2:** Apply via MCP `apply_migration` name `trip_members_sharing_default`.
- [ ] **Step 3:** Verify: `SELECT column_default FROM information_schema.columns WHERE table_name='trip_members' AND column_name='location_sharing';` → `'paused'::text`.
- [ ] **Step 4:** Commit.

## Task 2: Migration — Realtime Authorization

- [ ] **Step 1:** Create `supabase/migrations/20260601110002_realtime_authorization.sql`:

```sql
-- Phase 5A: private trip channels. Only trip members may receive/send on 'trip:{uuid}'.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members read trip channel" ON realtime.messages;
CREATE POLICY "Trip members read trip channel" ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member((substring(realtime.topic() FROM 6))::uuid, (select auth.uid()))
);

DROP POLICY IF EXISTS "Trip members send trip channel" ON realtime.messages;
CREATE POLICY "Trip members send trip channel" ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'trip:%'
  AND public.is_trip_member((substring(realtime.topic() FROM 6))::uuid, (select auth.uid()))
);
```

- [ ] **Step 2:** Apply via MCP. If `realtime.topic()` / `realtime.messages` shape differs, consult MCP `search_docs` ("Realtime Authorization") and adjust before applying.
- [ ] **Step 3:** Regenerate types (MCP `generate_typescript_types` → `src/core/supabase/types.ts`); `npm run typecheck`.
- [ ] **Step 4:** `get_advisors(security)` — confirm no new ERROR. Commit (migrations + types).

## Task 3: Pure util — channel topic + presence reduce (TDD)

- [ ] **Step 1:** Test `src/features/realtime/__tests__/channel.test.ts`:

```ts
import { tripTopic, presenceReduce } from '../utils/channel';

describe('channel utils', () => {
  it('builds a trip topic', () => {
    expect(tripTopic('abc')).toBe('trip:abc');
  });
  it('reduces a presence state map to a unique member list (latest wins)', () => {
    const state = {
      k1: [
        {
          user_id: 'u1',
          avatar_sprite_id: 's1',
          avatar_color: '#fff',
          status: 'online',
          current_milestone_id: 'm1',
        },
      ],
      k2: [
        {
          user_id: 'u2',
          avatar_sprite_id: 's2',
          avatar_color: '#000',
          status: 'online',
          current_milestone_id: null,
        },
      ],
    };
    const members = presenceReduce(state);
    expect(members.map((m) => m.user_id).sort()).toEqual(['u1', 'u2']);
  });
  it('dedupes the same user across keys', () => {
    const state = {
      a: [
        {
          user_id: 'u1',
          avatar_sprite_id: 's',
          avatar_color: '#fff',
          status: 'online',
          current_milestone_id: 'm1',
        },
      ],
      b: [
        {
          user_id: 'u1',
          avatar_sprite_id: 's',
          avatar_color: '#fff',
          status: 'idle',
          current_milestone_id: 'm2',
        },
      ],
    };
    expect(presenceReduce(state)).toHaveLength(1);
  });
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `src/features/realtime/utils/channel.ts`:

```ts
export interface PresenceMember {
  user_id: string;
  avatar_sprite_id: string;
  avatar_color: string;
  status: 'online' | 'idle';
  current_milestone_id: string | null;
}

export function tripTopic(tripId: string): string {
  return `trip:${tripId}`;
}

/** Flatten Supabase presence state ({key: meta[]}) into one entry per user_id. */
export function presenceReduce(state: Record<string, PresenceMember[]>): PresenceMember[] {
  const byUser = new Map<string, PresenceMember>();
  for (const metas of Object.values(state)) {
    for (const m of metas) byUser.set(m.user_id, m);
  }
  return [...byUser.values()];
}
```

- [ ] **Step 4:** Run → PASS. **Step 5:** Commit.

## Task 4: Pure util — milestone projection (TDD, extract from OverworldLayer)

- [ ] **Step 1:** Test `src/features/realtime/__tests__/projectMilestones.test.ts`:

```ts
import { projectMilestones } from '../utils/projectMilestones';
import type { BoundingBox } from '@features/map';

const bbox: BoundingBox = { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
const ms = [
  { id: 'a', lat: 0.2, lng: 0.2 },
  { id: 'b', lat: 0.8, lng: 0.8 },
  { id: 'c', lat: null, lng: null },
];

describe('projectMilestones', () => {
  it('positions geocoded milestones within the viewport and drops ungeocoded', () => {
    const out = projectMilestones(ms, bbox, 400, 600);
    expect(out.map((p) => p.id)).toEqual(['a', 'b']);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(400);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `src/features/realtime/utils/projectMilestones.ts` by lifting the exact normalization from `OverworldLayer` (REFERENCE_ZOOM 8, padBoundingBox 0.2, latLngToPixel, scale+offset). Signature:

```ts
import { latLngToPixel, padBoundingBox, type BoundingBox } from '@features/map';

const REFERENCE_ZOOM = 8;
const BBOX_PADDING_FRACTION = 0.2;

export interface ProjectedPoint {
  id: string;
  x: number;
  y: number;
}
interface Geo {
  id: string;
  lat: number | null;
  lng: number | null;
}

export function projectMilestones(
  items: readonly Geo[],
  bbox: BoundingBox,
  width: number,
  height: number,
): ProjectedPoint[] {
  const padded = padBoundingBox(bbox, BBOX_PADDING_FRACTION);
  const nw = latLngToPixel({ lat: padded.maxLat, lng: padded.minLng }, REFERENCE_ZOOM);
  const se = latLngToPixel({ lat: padded.minLat, lng: padded.maxLng }, REFERENCE_ZOOM);
  const pw = Math.max(se.x - nw.x, 1);
  const ph = Math.max(se.y - nw.y, 1);
  const scale = Math.min(width / pw, height / ph);
  const offsetX = (width - pw * scale) / 2;
  const offsetY = (height - ph * scale) / 2;
  const out: ProjectedPoint[] = [];
  for (const it of items) {
    if (it.lat == null || it.lng == null) continue;
    const p = latLngToPixel({ lat: it.lat, lng: it.lng }, REFERENCE_ZOOM);
    out.push({ id: it.id, x: (p.x - nw.x) * scale + offsetX, y: (p.y - nw.y) * scale + offsetY });
  }
  return out;
}
```

- [ ] **Step 4:** Refactor `OverworldLayer` to import + use `projectMilestones` (keep node rendering identical). Run map tests → PASS (no behavior change). **Step 5:** Run new test → PASS. **Step 6:** Commit. Ensure `@features/map` barrel exports `latLngToPixel`, `padBoundingBox`, `BoundingBox` (add if missing).

## Task 5: presenceStore (Zustand)

- [ ] **Step 1:** `src/features/realtime/store/presenceStore.ts`:

```ts
import { create } from 'zustand';

import type { PresenceMember } from '../utils/channel';

export interface LivePosition {
  lat: number;
  lng: number;
  ts: number;
}

interface PresenceState {
  membersByTrip: Record<string, PresenceMember[]>;
  positionsByUser: Record<string, LivePosition>; // 5B fills this
  setMembers: (tripId: string, members: PresenceMember[]) => void;
  setPosition: (userId: string, pos: LivePosition) => void;
  clearTrip: (tripId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  membersByTrip: {},
  positionsByUser: {},
  setMembers: (tripId, members) =>
    set((s) => ({ membersByTrip: { ...s.membersByTrip, [tripId]: members } })),
  setPosition: (userId, pos) =>
    set((s) => ({ positionsByUser: { ...s.positionsByUser, [userId]: pos } })),
  clearTrip: (tripId) =>
    set((s) => {
      const next = { ...s.membersByTrip };
      delete next[tripId];
      return { membersByTrip: next };
    }),
}));
```

- [ ] **Step 2:** `npm run typecheck` → PASS. **Step 3:** Commit.

## Task 6: `useTripChannel` hook (presence + postgres_changes + status)

- [ ] **Step 1:** `src/features/realtime/hooks/useTripChannel.ts` — subscribe on mount, track self (unless sharing `never`/panic), wire presence sync → `presenceStore.setMembers(presenceReduce(...))`, postgres_changes on `milestones` (`trip_id=eq.`) + `checkins` (RLS-gated) → debounced `invalidateQueries(milestonesQueryKey/tripCheckinsQueryKey)`, expose `{ status }`. Complete code:

```ts
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@core/supabase/client';
import { milestonesQueryKey, tripCheckinsQueryKey } from '@features/milestones';

import { tripTopic, presenceReduce, type PresenceMember } from '../utils/channel';
import { usePresenceStore } from '../store/presenceStore';

export type RealtimeStatus = 'connecting' | 'connected' | 'offline';

export function useTripChannel(tripId: string, self: PresenceMember | null, share: boolean) {
  const qc = useQueryClient();
  const setMembers = usePresenceStore((s) => s.setMembers);
  const clearTrip = usePresenceStore((s) => s.clearTrip);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const channel = supabase.channel(tripTopic(tripId), {
      config: { private: true, presence: { key: self?.user_id ?? 'anon' } },
    });
    const invalidate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
        void qc.invalidateQueries({ queryKey: tripCheckinsQueryKey(tripId) });
      }, 400);
    };
    channel
      .on('presence', { event: 'sync' }, () => {
        setMembers(tripId, presenceReduce(channel.presenceState() as never));
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones', filter: `trip_id=eq.${tripId}` },
        invalidate,
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, invalidate)
      .subscribe((s) => {
        if (cancelled) return;
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
          if (self && share) void channel.track(self);
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('offline');
        }
      });
    return () => {
      cancelled = true;
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
      clearTrip(tripId);
    };
  }, [tripId, self, share, qc, setMembers, clearTrip]);

  return { status };
}
```

- [ ] **Step 2:** `npm run typecheck`. NB: confirm `milestonesQueryKey`/`tripCheckinsQueryKey` are exported from `@features/milestones` (seen in TripDetailScreen imports). **Step 3:** Commit.

## Task 7: `PixelAvatar` (TDD)

- [ ] **Step 1:** Test `src/features/realtime/__tests__/PixelAvatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { PixelAvatar } from '../components/PixelAvatar';

it('renders with an accessibility label from the display name', () => {
  render(<PixelAvatar spriteId="avatars/adventurer_1" color="#E63946" label="Amos" />);
  expect(screen.getByLabelText('Amos')).toBeTruthy();
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `PixelAvatar.tsx` using the avatar manifest (`@assets/sprites/avatars/manifest`) to resolve `spriteId` → image source; render `<Image>` in a color-ringed `View` with `accessibilityLabel={label}`. (Read `src/assets/sprites/avatars/manifest.ts` for the resolver shape.) **Step 4:** Run → PASS. **Step 5:** Commit.

## Task 8: `LiveAvatarsLayer` + OverworldLayer integration

- [ ] **Step 1:** `LiveAvatarsLayer.tsx`: props `{ members: PresenceMember[]; positioned: ProjectedPoint[] }`. Map each member→ its `current_milestone_id` position; `cluster()` overlapping avatars (reuse `@features/map` clustering, threshold 40px); render `PixelAvatar` (or a count bubble for clusters) absolutely at `{x,y}`. Lerp position changes with Reanimated; snap if reduced-motion.
- [ ] **Step 2:** In `OverworldLayer`: add optional `liveMembers?: PresenceMember[]`; after computing `positioned`, render `<LiveAvatarsLayer members={liveMembers ?? []} positioned={positioned.map(p=>({id:p.milestone.id,x:p.x,y:p.y}))} />`.
- [ ] **Step 3:** Thread `liveMembers` through `MapCrossfade` → `OverworldLayer`, and `TripMapView` → `MapCrossfade` (extend the prop types).
- [ ] **Step 4:** `npm run typecheck && npm test -- map realtime` → PASS. **Step 5:** Commit.

## Task 9: Sharing API + `useLocationSharing` + SharingControls + OfflineBanner

- [ ] **Step 1:** `api/sharing.ts`: `getMySharing(tripId)` (select `location_sharing,panic_until` where trip_id+user_id=self), `setSharing(tripId, mode)`, `setPanic(tripId, until|null)`.
- [ ] **Step 2:** `hooks/useLocationSharing.ts`: TanStack query + mutations (invalidate self).
- [ ] **Step 3:** `SharingControls.tsx`: 4 `PixelChip`s (precise/city_only/paused/never) + a "Hide live 1h" `PixelButton` setting `panic_until = now+1h`. i18n labels.
- [ ] **Step 4:** `OfflineBanner.tsx`: shows `t('realtime.offline')` when status==='offline'.
- [ ] **Step 5:** `npm run typecheck && npm run lint`. **Step 6:** Commit.

## Task 10: Wire into TripDetailScreen + i18n + barrel

- [ ] **Step 1:** In `TripDetailScreen`: build `self` from `useProfile()` (avatar_sprite_id/color) + derive `current_milestone_id` from latest checkin; read sharing via `useLocationSharing`; `const { status } = useTripChannel(trip.id, self, sharingShares)`; pass `liveMembers={usePresenceStore(s => s.membersByTrip[trip.id] ?? [])}` into `TripMapView`; render `<OfflineBanner status={status} />` + `<SharingControls tripId={trip.id} />`.
- [ ] **Step 2:** Add `realtime.*` i18n (en+fr): `offline`, `sharing.{precise,city_only,paused,never,label}`, `panic.{cta,active}`, `permission.*` (5B). Mirror keys in both locales.
- [ ] **Step 3:** `index.ts` barrel exports `useTripChannel`, `usePresenceStore`, `SharingControls`, `OfflineBanner`, `PixelAvatar`, `tripTopic`.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm test`. **Step 5:** Commit + push.

## Task 11: Contract tests (auditing-runtime-contracts)

- [ ] **Step 1:** `__tests__/contracts.test.ts`: (a) every static `t('realtime.*')` resolves en+fr; (b) `location_sharing` enum values (`precise|city_only|paused|never`) each have a `realtime.sharing.*` label en+fr; (c) `tripTopic(uuid)` matches `/^trip:[0-9a-f-]{36}$/`.
- [ ] **Step 2:** Run → PASS (fix i18n gaps). **Step 3:** `get_advisors(security)` clean. **Step 4:** Commit + push.

---

## Self-Review

- **Spec coverage:** channel auth (T2), presence (T6), live check-ins (T6), avatars+projection (T4,7,8), privacy/panic (T9), default→paused (T1), reliability/offline (T6,9), store (T5), i18n/contracts (T10,11). ✔
- **Placeholders:** UI tasks (8,9,10) give concrete props + the function to call + which file to read; pure units + migrations + channel hook have full code.
- **Type consistency:** `PresenceMember`, `ProjectedPoint`, `tripTopic`, `presenceReduce`, `usePresenceStore` consistent across tasks; `RealtimeStatus` shared by hook + banner.
- **Deferred:** real-map (MapLibre) avatar markers — overworld layer only in 5A (note in T8); GPS in 5B.
