# Phase 2 — Milestones + Path UI (Duolingo) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or batch directly. Each code task → invoke `code-validator` agent (mandatory per CLAUDE.md).

**Goal:** Deliver the visual core of the app — milestones rendered as a sinuous Duolingo-style path inside each trip, with sprite-based nodes (city / hotel / activity / etc.), Bézier curve edges, and tap-to-checkin flow. By the end, a user can create a trip → add 3-5 milestones with locations → see them arranged on the path → check in by tapping a node → see it unlock the next one with animation + sound prep.

**Architecture:** Port of `bryanjenningz/react-duolingo` indentation algorithm + custom SVG Bézier path layer + Skia-friendly animations. Milestones stored in Postgres with PostGIS geography for lat/lng. Sprite library curated from Kenney CC0 assets (~30 sprites for v1, more added per phase). MilestoneCreationSheet uses CountryPicker pattern + MapTiler/Nominatim geocoding for location search.

**Tech additions:** PostGIS extension, MapTiler Geocoding (free tier), Reanimated stroke animation, react-native-svg `<Path>` Bézier.

**Reference spec:** `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md` Sections 5 (milestones schema), 6.5 (LevelSelectNode + Edge specs), 7 (map system).

---

## File Structure

```
/src/features/milestones/
  /api
    milestones.ts            # T7: CRUD + geocoding
    geocoding.ts             # T7: MapTiler / Nominatim wrapper
  /hooks
    useMilestones.ts         # T7
    useMilestone.ts          # T7
    useCheckin.ts            # T14
  /components
    MilestoneNode.tsx        # T8: Duolingo circle node with sprite + states
    MilestoneEdge.tsx        # T9: SVG Bézier curve between nodes
    PathView.tsx             # T10: assembled path with indentation
    MilestoneCreationSheet.tsx  # T11: bottom sheet, type chips, location search
    SpritePicker.tsx         # T12: modal grid of curated sprites
    CheckinAnim.tsx          # T14: coin burst + haptic + animation
  /utils
    pathLayout.ts            # T10: indentation cycle (sanidhyy port) + Bézier control points
  /__tests__
    pathLayout.test.ts       # T10
    milestones.test.ts       # T7
  index.ts

/src/shared/components/
  PixelBottomSheet/          # T4: reusable bottom sheet with drag-to-dismiss
  PixelDialog/               # T5: reusable modal dialog

/src/assets/sprites/
  /milestones                # T6: ~30 Kenney sprites curated
    castle.png, flag.png, star.png, mountain.png, ... 30 files
    manifest.ts              # T6

/supabase/migrations/
  20260525120001_milestones.sql  # T1: milestones table + RLS + PostGIS

/src/core/supabase/types.ts  # T2: regen after migration
```

---

## Task 1: DB migration — milestones table + RLS + PostGIS

**Files:** apply via Supabase MCP `apply_migration`, save to `supabase/migrations/20260525120001_milestones.sql`.

SQL:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  order_index decimal NOT NULL,           -- fractional for concurrent-friendly reorder
  type text NOT NULL CHECK (type IN ('city','hotel','activity','transport','food','landmark','custom')),
  custom_type_label text,                  -- if type='custom'
  name text NOT NULL,
  description text,
  location geography(Point, 4326),         -- PostGIS
  address text,
  arrival_at timestamptz,
  departure_at timestamptz,
  is_boss boolean DEFAULT false,
  sprite_id text,
  color text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (arrival_at IS NULL OR departure_at IS NULL OR departure_at >= arrival_at)
);

CREATE INDEX idx_milestones_trip_order ON public.milestones(trip_id, order_index);
CREATE INDEX idx_milestones_location ON public.milestones USING GIST (location);

DROP TRIGGER IF EXISTS milestones_updated_at ON public.milestones;
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can SELECT milestones for their trips"
  ON public.milestones FOR SELECT USING (public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Editors can INSERT milestones"
  ON public.milestones FOR INSERT WITH CHECK (public.is_trip_editor(trip_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Editors can UPDATE milestones"
  ON public.milestones FOR UPDATE USING (public.is_trip_editor(trip_id, auth.uid()));
CREATE POLICY "Editors can DELETE milestones"
  ON public.milestones FOR DELETE USING (public.is_trip_editor(trip_id, auth.uid()));

-- Checkins table (used by T14)
CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  location_actual geography(Point, 4326),
  note text,
  UNIQUE (milestone_id, user_id)            -- one checkin per user per milestone
);

CREATE INDEX idx_checkins_milestone ON public.checkins(milestone_id);
CREATE INDEX idx_checkins_user ON public.checkins(user_id);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can SELECT checkins for their trips"
  ON public.checkins FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = milestone_id AND public.is_trip_member(m.trip_id, auth.uid())
    )
  );
CREATE POLICY "Users can INSERT own checkins for trip milestones"
  ON public.checkins FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = milestone_id AND public.is_trip_member(m.trip_id, auth.uid())
    )
  );
CREATE POLICY "Users can DELETE own checkins"
  ON public.checkins FOR DELETE USING (user_id = auth.uid());
```

---

## Task 2: Regen TS types from Supabase

After T1 migration applied, call `mcp__plugin_supabase_supabase__generate_typescript_types` and overwrite `src/core/supabase/types.ts`. Verify `npm run typecheck` passes.

---

## Task 3: SpriteLibrary curation (~30 Kenney sprites)

Download Kenney packs (CC0):
- **Tiny Town** → city/town markers (8 sprites)
- **Medieval RTS** → castle/hotel sprites (6 sprites)
- **Pixel Platformer** → flag/star/coin markers (8 sprites)
- **Board Game Icons** → trophy/medal for boss (4 sprites)
- **Tiny Dungeon** → activity icons (4 sprites)

Save under `src/assets/sprites/milestones/` (32x32 PNG). Build manifest:

```typescript
// src/assets/sprites/milestones/manifest.ts
export const MILESTONE_SPRITES = [
  { id: 'milestones/castle_red', source: require('./castle_red.png'), category: 'hotel', label: 'Castle' },
  { id: 'milestones/flag_red', source: require('./flag_red.png'), category: 'city', label: 'Flag' },
  { id: 'milestones/star_gold', source: require('./star_gold.png'), category: 'activity', label: 'Star' },
  // ... 30 entries
] as const;

export type MilestoneSpriteId = (typeof MILESTONE_SPRITES)[number]['id'];

export const defaultSpriteForType = (type: string): MilestoneSpriteId => {
  switch (type) {
    case 'hotel': return 'milestones/castle_red';
    case 'city': return 'milestones/flag_red';
    case 'activity': return 'milestones/star_gold';
    case 'transport': return 'milestones/airplane';
    case 'food': return 'milestones/pizza';
    case 'landmark': return 'milestones/mountain';
    default: return 'milestones/flag_red';
  }
};
```

---

## Task 4: PixelBottomSheet DS component

Reusable bottom sheet with drag-to-dismiss, used by T11 MilestoneCreationSheet. Use `@gorhom/bottom-sheet` library OR implement custom with Reanimated + GestureDetector.

```typescript
// src/shared/components/PixelBottomSheet/PixelBottomSheet.tsx
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, ReactNode } from 'react';
// ...
```

Tests: opens at snap point, drag-to-dismiss closes, content rendered.

---

## Task 5: PixelDialog DS component

Reusable modal with spring entrance + dark scrim. Used for confirmations and quick popups.

---

## Task 6: Milestones API + hooks + tests

```typescript
// src/features/milestones/api/milestones.ts
export async function listMilestones(tripId: string): Promise<Milestone[]>
export async function createMilestone(input: MilestoneInsert): Promise<Milestone>
export async function updateMilestone(id: string, updates: MilestoneUpdate): Promise<Milestone>
export async function deleteMilestone(id: string): Promise<void>
export async function reorderMilestones(tripId: string, orderUpdates: { id: string; order_index: number }[]): Promise<void>
```

Hooks: `useMilestones(tripId)`, `useMilestone(id)`, `useCheckin(milestoneId)`.

---

## Task 7: Geocoding service (MapTiler)

```typescript
// src/features/milestones/api/geocoding.ts
export interface GeocodingResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

export async function searchPlaces(query: string): Promise<GeocodingResult[]>
```

Use MapTiler API (already in env) free tier. Debounce 300ms in UI.

---

## Task 8: MilestoneNode component

Duolingo-style circle with sprite + states (locked / available / current / completed). Sizes 72px regular, 100px boss. Animations via Reanimated.

```typescript
export interface MilestoneNodeProps {
  milestone: Milestone;
  state: 'locked' | 'available' | 'current' | 'completed';
  isBoss?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}
```

States:
- locked: grayscale + lock icon overlay
- available: blue bg + pulsing yellow ring
- current: gold bg + crown sprite above + glow
- completed: green bg + flag/check overlay

---

## Task 9: MilestoneEdge component (SVG Bézier)

```typescript
export interface MilestoneEdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  state: 'locked' | 'available' | 'completed';
  animateProgress?: number; // 0-1, controls strokeDashoffset
}
```

Uses `<Path>` from `react-native-svg` with cubic Bézier `M x1,y1 C cx1,cy1 cx2,cy2 x2,y2`. Stroke 5px, color by state.

---

## Task 10: PathView component + pathLayout util

`utils/pathLayout.ts`: indentation cycle (port of sanidhyy's algorithm — `tileLeftClassNames`), Bézier control point computation.

```typescript
export const INDENTATION_PATTERN = [0, 1, 2, 1, 0, -1, -2, -1];
export const HORIZONTAL_STEP = 60; // px per indentation unit
export const VERTICAL_STEP = 120;  // px between consecutive nodes

export function nodePosition(index: number): { x: number; y: number } {
  const pattern = INDENTATION_PATTERN[index % INDENTATION_PATTERN.length];
  return { x: 180 + pattern * HORIZONTAL_STEP, y: 80 + index * VERTICAL_STEP };
}

export function bezierControlPoints(from: Position, to: Position) {
  // mid-point with offset to create sinuous curve
  const midY = (from.y + to.y) / 2;
  return [{ x: from.x, y: midY }, { x: to.x, y: midY }];
}
```

`PathView` assembles MilestoneNodes + MilestoneEdges in a ScrollView. Total height = `80 + milestones.length * VERTICAL_STEP + 80`.

Tests: `pathLayout.test.ts` validates indentation cycle and Bézier control points.

---

## Task 11: MilestoneCreationSheet

Bottom sheet with:
- Type chips (city / hotel / activity / transport / food / landmark / custom)
- Name input
- Location search (debounced geocoding)
- Dates (optional)
- "Mark as boss" toggle
- Sprite picker trigger (opens SpritePicker)

On save → call `createMilestone` → close sheet → list invalidates.

---

## Task 12: SpritePicker component

Modal grid (4 columns) of `MILESTONE_SPRITES`, filterable by category. Tap selects + returns.

---

## Task 13: Replace TripDetailScreen placeholder with PathView

Remove "Path UI lands in Phase 2" placeholder. Render `<PathView milestones={milestones} />` + floating "+ Add milestone" button that opens MilestoneCreationSheet.

---

## Task 14: Checkin flow

Long-press on `current` or `available` milestone → CheckinAnim:
- Haptic medium impact
- Coin burst particles (Skia)
- Stroke fills next edge (animateProgress 0→1)
- Sound (TBD, deferred Phase 6)
- DB write via `useCheckin`
- Optimistic UI update

---

## Task 15: Final tests + code-validator + push

Run full test suite, code-validator on full batch, push to GitHub, monitor CI.

---

## Completion criteria

- 2 new DB tables (`milestones` + `checkins`) with RLS + PostGIS
- TS types regenerated
- 2 new DS components (PixelBottomSheet, PixelDialog) with tests
- 30 milestone sprites curated + manifest
- features/milestones module with api/hooks/components/utils/tests
- TripDetailScreen shows the path with milestones
- Tap-to-create + long-press-to-checkin work end-to-end
- Animations: stroke draw, node states, coin burst
- 50+ tests passing
- All i18n keys (en + fr)

**Estimated**: ~15 tasks, ~2 weeks of focused work, ~3000 lines of code.
