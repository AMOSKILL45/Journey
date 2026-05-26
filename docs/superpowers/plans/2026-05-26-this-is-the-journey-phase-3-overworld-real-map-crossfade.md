# Phase 3 — Overworld + Real Map + Crossfade Implementation Plan

> **For agentic workers:** Execute task-by-task. After each code task: run `npm run typecheck && npm run lint && npm test` inline (per user feedback: NO subagent, validator runs inline). Commit per task with conventional commit messages.

**Goal:** Deliver the dual-layer map system. Each trip can be viewed in two layered modes — a hand-crafted **Overworld** (Mario-style background + sprite milestones + Bézier path) and a **Real Map** (MapLibre vector tiles with a custom Cozy Map style). A pinch-to-zoom gesture crossfades between them (Reanimated opacity + camera sync). By the end, a user toggles between Path / Map view inside `TripDetailScreen`, pinches to zoom from Overworld to Real Map, and sees their milestones rendered geographically on both layers.

**Architecture:** Two stacked layers driven by a single `zoomLevel` Reanimated `sharedValue`:

- Layer A (Overworld) — Skia background tileset per theme + SVG nodes + Bézier edges (reuse Phase 2 `MilestoneNode` / `MilestoneEdge`), positioned via simplified Mercator from the trip's milestone lat/lngs.
- Layer B (Real Map) — `@maplibre/maplibre-react-native` with a custom Cozy Map style JSON (flat saturated palette) + custom RN markers overlay.
- Crossfade — between zoom 9–11, interpolate opacity A:1→0 / B:0→1, sync camera lat/lng, swap pointer events.

**Tech additions:** `@maplibre/maplibre-react-native`, `@shopify/react-native-skia`, `react-native-svg` (already), `react-native-reanimated` (already). MapTiler vector tiles (already-keyed for geocoding — same key extends to map tiles). EAS dev client REQUIRED — `npm run dev` in Expo Go won't work past T1.

**Reference spec:** `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md` Sections 6.3 (world theme palettes), 7 (map system), 12.1 (phase 3 scope).

**Pre-requisite caveat:** EAS dev client build (Phase 0 T15) was deferred. This plan ships **code, types, unit tests, and configuration** without requiring a working dev client. Tasks that need a running app (visual smoke test of MapLibre, Skia rendering) are explicitly tagged `[needs-dev-client]` and can be re-run when EAS build is unblocked.

---

## File Structure

```
/src/features/map/
  /api
    offlinePacks.ts            # T14: MapLibre offline pack mgmt (download bbox / evict)
  /hooks
    useZoomLevel.ts            # T8: Reanimated sharedValue zoom + helpers
    useMapCamera.ts            # T8: camera state (lat/lng/bearing/zoom)
    useTripBoundingBox.ts      # T3: derive bbox from milestone locations
  /components
    OverworldBackground.tsx    # T5: Skia themed bg + drifting clouds
    OverworldLayer.tsx         # T6: nodes + edges via mercator coordinates
    RealMapLayer.tsx           # T10: MapLibre + style + RN marker overlay
    MapCrossfade.tsx           # T12: orchestrator, opacity interpolation
    TripMapView.tsx            # T13: stitched A+B+crossfade
    MapModeToggle.tsx          # T13: Path | Map segmented control
    PixelCluster.tsx           # T7: cluster bubble w/ count badge
  /utils
    mercator.ts                # T3: lat/lng → x/y (web mercator simplified)
    clustering.ts              # T7: screen-distance clustering (40px)
    worldThemes.ts             # T4: theme manifest (Adventure Generic, USA Desert)
    cozyMapStyle.ts            # T9: MapLibre style JSON (Cozy Map)
  /__tests__
    mercator.test.ts           # T3
    clustering.test.ts         # T7
    worldThemes.test.ts        # T4
    cozyMapStyle.test.ts       # T9
    useZoomLevel.test.ts       # T8
  index.ts                     # T16: barrel exports

/src/assets/worldThemes/
  /adventure-generic
    background.png             # T4: 1024x1536 portrait
  /usa-desert
    background.png             # T4

/src/features/trips/screens/TripDetailScreen.tsx  # T13: Path/Map toggle wired

/src/core/i18n/locales/
  en.json                      # T15: map keys
  fr.json                      # T15: map keys

/supabase/migrations/
  20260526120001_milestones_latlng.sql  # T2: ST_X/ST_Y generated columns

/src/core/supabase/types.ts    # T2: regen after migration
/app.json                      # T1: native config plugins for MapLibre + Skia
/package.json                  # T1: deps
```

---

## Task 1: Install deps + Expo plugins config

**Files:**

- Modify: `package.json` (deps)
- Modify: `app.json` (plugins, permissions)

Add deps:

```bash
npx expo install @maplibre/maplibre-react-native @shopify/react-native-skia
```

Edit `app.json` to register the MapLibre plugin (required for Android attribution + iOS Info.plist):

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "ios": { "deploymentTarget": "15.1" } }],
      "@maplibre/maplibre-react-native"
    ],
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Used to center the map on your position during your trips."
      }
    }
  }
}
```

- [ ] Run: `npx expo install @maplibre/maplibre-react-native @shopify/react-native-skia`
- [ ] Run: `npm run typecheck` — expect PASS
- [ ] Commit: `chore: add maplibre + skia deps for phase 3 map system`

---

## Task 2: DB migration — expose lat/lng on milestones

**Files:**

- Apply via `mcp__plugin_supabase_supabase__apply_migration`, save to `supabase/migrations/20260526120001_milestones_latlng.sql`.
- Regenerate `src/core/supabase/types.ts`.

The PostGIS `location geography(Point, 4326)` column returns as `unknown` in the generated TS types — Phase 2 only writes to it. Phase 3 needs to read coordinates back. Add two generated columns:

```sql
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS lat double precision
    GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lng double precision
    GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

CREATE INDEX IF NOT EXISTS idx_milestones_lat ON public.milestones(lat) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_milestones_lng ON public.milestones(lng) WHERE lng IS NOT NULL;
```

After applying:

- [ ] Run `mcp__plugin_supabase_supabase__generate_typescript_types` → overwrite `src/core/supabase/types.ts`.
- [ ] Verify `Milestone` type now has `lat: number | null` and `lng: number | null`.
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Commit: `feat(db): expose lat/lng generated columns on milestones`

---

## Task 3: Mercator + trip bounding box utils

**Files:**

- Create: `src/features/map/utils/mercator.ts`
- Create: `src/features/map/hooks/useTripBoundingBox.ts`
- Test: `src/features/map/__tests__/mercator.test.ts`

`mercator.ts`:

```typescript
export interface LatLng {
  lat: number;
  lng: number;
}

export interface PixelXY {
  x: number;
  y: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const R = 6378137; // Earth radius (m)
const MAX_LAT = 85.05112878; // Web Mercator clamp

export function latLngToPixel(p: LatLng, zoom: number, tileSize = 256): PixelXY {
  const lat = Math.max(Math.min(p.lat, MAX_LAT), -MAX_LAT);
  const scale = tileSize * Math.pow(2, zoom);
  const x = ((p.lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function pixelToLatLng(px: PixelXY, zoom: number, tileSize = 256): LatLng {
  const scale = tileSize * Math.pow(2, zoom);
  const lng = (px.x / scale) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (px.y / scale);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export function computeBoundingBox(points: LatLng[]): BoundingBox | null {
  if (points.length === 0) return null;
  return points.reduce<BoundingBox>(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      maxLat: Math.max(acc.maxLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLng: Math.max(acc.maxLng, p.lng),
    }),
    {
      minLat: points[0].lat,
      maxLat: points[0].lat,
      minLng: points[0].lng,
      maxLng: points[0].lng,
    },
  );
}

export function bboxCenter(bbox: BoundingBox): LatLng {
  return { lat: (bbox.minLat + bbox.maxLat) / 2, lng: (bbox.minLng + bbox.maxLng) / 2 };
}

export function padBoundingBox(bbox: BoundingBox, paddingFraction = 0.15): BoundingBox {
  const latPad = (bbox.maxLat - bbox.minLat) * paddingFraction || 0.05;
  const lngPad = (bbox.maxLng - bbox.minLng) * paddingFraction || 0.05;
  return {
    minLat: bbox.minLat - latPad,
    maxLat: bbox.maxLat + latPad,
    minLng: bbox.minLng - lngPad,
    maxLng: bbox.maxLng + lngPad,
  };
}
```

Tests cover: equator origin (0,0) → (tileSize/2, tileSize/2) at zoom 0, NYC round-trip, bbox of 3 points, single-point bbox padding falls back to 0.05.

`useTripBoundingBox.ts` (consumes the `lat`/`lng` columns added in T2):

```typescript
import { useMemo } from 'react';
import type { Milestone } from '@features/milestones';
import { computeBoundingBox, type BoundingBox, type LatLng } from '../utils/mercator';

export function useTripBoundingBox(milestones: Milestone[]): BoundingBox | null {
  return useMemo(() => {
    const points: LatLng[] = milestones
      .filter((m): m is Milestone & { lat: number; lng: number } => m.lat != null && m.lng != null)
      .map((m) => ({ lat: m.lat, lng: m.lng }));
    return computeBoundingBox(points);
  }, [milestones]);
}
```

- [ ] Write tests first; run, expect FAIL.
- [ ] Implement util + hook.
- [ ] Run: `npm test src/features/map/__tests__/mercator.test.ts` — expect PASS.
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Commit: `feat(map): mercator helpers + trip bounding box hook`

---

## Task 4: World theme manifest + placeholder assets

**Files:**

- Create: `src/features/map/utils/worldThemes.ts`
- Create: `src/assets/worldThemes/adventure-generic/background.png` (placeholder solid color 1024×1536)
- Create: `src/assets/worldThemes/usa-desert/background.png` (placeholder solid color)
- Test: `src/features/map/__tests__/worldThemes.test.ts`

Per spec section 6.3, two themes for Phase 3:

```typescript
// src/features/map/utils/worldThemes.ts
import { ImageSourcePropType } from 'react-native';

export type WorldThemeId = 'adventure-generic' | 'usa-desert';

export interface WorldTheme {
  id: WorldThemeId;
  label: string;
  background: ImageSourcePropType;
  skyTopColor: string;
  skyBottomColor: string;
  groundColor: string;
  accents: string[];
}

export const WORLD_THEMES: Record<WorldThemeId, WorldTheme> = {
  'adventure-generic': {
    id: 'adventure-generic',
    label: 'Adventure',
    background: require('../../../assets/worldThemes/adventure-generic/background.png'),
    skyTopColor: '#FFCB05',
    skyBottomColor: '#E63946',
    groundColor: '#7DA847',
    accents: ['#6BBFE2', '#FFCB05', '#E63946', '#2A9D8F'],
  },
  'usa-desert': {
    id: 'usa-desert',
    label: 'Desert',
    background: require('../../../assets/worldThemes/usa-desert/background.png'),
    skyTopColor: '#FFB174',
    skyBottomColor: '#FCE4B6',
    groundColor: '#FCE4B6',
    accents: ['#3C8DBC', '#D6362B', '#7DA847'],
  },
};

export function pickWorldTheme(country?: string | null): WorldThemeId {
  if (country && ['US', 'USA'].includes(country)) return 'usa-desert';
  return 'adventure-generic';
}
```

Tests: `pickWorldTheme('US')` → `'usa-desert'`, `pickWorldTheme(null)` → `'adventure-generic'`, all themes have required fields.

Placeholder PNGs: generate 1024×1536 solid color via Node (or commit a 2×3 px file inflated by `expo-image` — for Phase 3 we just need a valid image source; real art lands in Phase 8). Use a small Node script to generate a PNG using the `pngjs` lib if installed, else commit a hand-crafted minimal valid PNG.

- [ ] Generate placeholder PNGs (1024×1536, solid skyBottomColor) — can be replaced in Phase 8.
- [ ] Implement manifest + tests.
- [ ] Run: `npm test src/features/map/__tests__/worldThemes.test.ts` — expect PASS.
- [ ] Commit: `feat(map): world theme manifest + placeholder backgrounds`

---

## Task 5: OverworldBackground (Skia)

**Files:**

- Create: `src/features/map/components/OverworldBackground.tsx`

Skia `Canvas` with `Image` filling viewport + 3 drifting `Image` cloud sprites animated via `useSharedValue` + `useDerivedValue` (translateX over 30s loop). For Phase 3 MVP, accept a single background image and skip drifting clouds — implement static background only, expose `clouds?: ImageSourcePropType[]` prop for future. Clouds drift to be added in Phase 8.

```typescript
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { useWindowDimensions, View } from 'react-native';
import { WORLD_THEMES, type WorldThemeId } from '../utils/worldThemes';

export interface OverworldBackgroundProps {
  themeId: WorldThemeId;
}

export function OverworldBackground({ themeId }: OverworldBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const theme = WORLD_THEMES[themeId];
  const image = useImage(theme.background);
  if (!image) {
    return (
      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.skyBottomColor,
        }}
      />
    );
  }
  return (
    <Canvas style={{ position: 'absolute', width, height }}>
      <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" />
    </Canvas>
  );
}
```

- [ ] Implement component (no Jest test — purely visual, covered by typecheck).
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Commit: `feat(map): overworld background skia component`

---

## Task 6: OverworldLayer (mercator-positioned nodes + Bézier path)

**Files:**

- Create: `src/features/map/components/OverworldLayer.tsx`

Render milestones as `MilestoneNode` (reuse Phase 2 component) positioned via `latLngToPixel` at a fixed reference zoom (e.g. 8), normalised against the trip bounding box → screen space. Edges between consecutive milestones via `MilestoneEdge` (verified shape: `from: NodePosition`, `to: NodePosition`, `state`).

```typescript
import { Svg } from 'react-native-svg';
import { useWindowDimensions, View } from 'react-native';
import { MilestoneNode, MilestoneEdge, type Milestone } from '@features/milestones';
import { latLngToPixel, padBoundingBox } from '../utils/mercator';
import type { BoundingBox } from '../utils/mercator';

const REFERENCE_ZOOM = 8;
const NODE_DIAMETER = 72;

export interface OverworldLayerProps {
  milestones: Milestone[];
  bbox: BoundingBox;
  checkedInIds: Set<string>;
  onNodePress?: (m: Milestone) => void;
  onNodeLongPress?: (m: Milestone) => void;
}

export function OverworldLayer({
  milestones,
  bbox,
  checkedInIds,
  onNodePress,
  onNodeLongPress,
}: OverworldLayerProps) {
  const { width, height } = useWindowDimensions();
  const padded = padBoundingBox(bbox, 0.2);

  const nw = latLngToPixel({ lat: padded.maxLat, lng: padded.minLng }, REFERENCE_ZOOM);
  const se = latLngToPixel({ lat: padded.minLat, lng: padded.maxLng }, REFERENCE_ZOOM);
  const projW = se.x - nw.x;
  const projH = se.y - nw.y;
  const scale = projW > 0 && projH > 0 ? Math.min(width / projW, height / projH) : 1;
  const offsetX = (width - projW * scale) / 2;
  const offsetY = (height - projH * scale) / 2;

  const project = (m: Milestone) => {
    if (m.lat == null || m.lng == null) return null;
    const p = latLngToPixel({ lat: m.lat, lng: m.lng }, REFERENCE_ZOOM);
    return {
      x: (p.x - nw.x) * scale + offsetX,
      y: (p.y - nw.y) * scale + offsetY,
    };
  };

  const positioned = milestones
    .map((m) => ({ m, pos: project(m) }))
    .filter((entry): entry is { m: Milestone; pos: { x: number; y: number } } => entry.pos !== null);

  return (
    <View style={{ position: 'absolute', inset: 0 }} pointerEvents="box-none">
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {positioned.slice(0, -1).map((entry, i) => {
          const next = positioned[i + 1];
          const fromCompleted = checkedInIds.has(entry.m.id);
          return (
            <MilestoneEdge
              key={`${entry.m.id}-${next.m.id}`}
              from={entry.pos}
              to={next.pos}
              state={fromCompleted ? 'completed' : 'locked'}
            />
          );
        })}
      </Svg>
      {positioned.map((entry) => {
        const completed = checkedInIds.has(entry.m.id);
        return (
          <View
            key={entry.m.id}
            style={{
              position: 'absolute',
              left: entry.pos.x - NODE_DIAMETER / 2,
              top: entry.pos.y - NODE_DIAMETER / 2,
            }}
          >
            <MilestoneNode
              milestone={entry.m}
              state={completed ? 'completed' : 'available'}
              isBoss={entry.m.is_boss ?? false}
              onPress={() => onNodePress?.(entry.m)}
              onLongPress={() => onNodeLongPress?.(entry.m)}
            />
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] Verify `MilestoneNode` props (open `src/features/milestones/components/MilestoneNode.tsx`) — adapt if signature differs.
- [ ] Implement component.
- [ ] Run: `npm run typecheck && npm run lint` — expect PASS.
- [ ] Commit: `feat(map): overworld layer with mercator-positioned milestones`

---

## Task 7: Clustering + PixelCluster component

**Files:**

- Create: `src/features/map/utils/clustering.ts`
- Create: `src/features/map/components/PixelCluster.tsx`
- Test: `src/features/map/__tests__/clustering.test.ts`

```typescript
// utils/clustering.ts
export interface ClusterablePoint<T> {
  data: T;
  x: number;
  y: number;
}

export interface Cluster<T> {
  cx: number;
  cy: number;
  members: T[];
}

export const CLUSTER_THRESHOLD_PX = 40;

export function cluster<T>(
  points: ClusterablePoint<T>[],
  thresholdPx = CLUSTER_THRESHOLD_PX,
): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];
  for (const point of points) {
    const target = clusters.find((c) => Math.hypot(c.cx - point.x, c.cy - point.y) < thresholdPx);
    if (target) {
      target.members.push(point.data);
      target.cx = (target.cx * (target.members.length - 1) + point.x) / target.members.length;
      target.cy = (target.cy * (target.members.length - 1) + point.y) / target.members.length;
    } else {
      clusters.push({ cx: point.x, cy: point.y, members: [point.data] });
    }
  }
  return clusters;
}
```

`PixelCluster.tsx` is a circular bubble (primary-500 bg, 2px primary-700 border) with a small pixel font count badge `+N`.

Tests: 0 points → 0 clusters, 2 within threshold → 1 cluster with both members, 3 spread apart → 3 clusters.

- [ ] Tests first, expect FAIL.
- [ ] Implement util + component.
- [ ] Run: `npm test src/features/map/__tests__/clustering.test.ts` — expect PASS.
- [ ] Commit: `feat(map): clustering util + PixelCluster component`

---

## Task 8: Zoom + camera hooks

**Files:**

- Create: `src/features/map/hooks/useZoomLevel.ts`
- Create: `src/features/map/hooks/useMapCamera.ts`
- Test: `src/features/map/__tests__/useZoomLevel.test.ts`

```typescript
// useZoomLevel.ts
import { useSharedValue, useDerivedValue, type SharedValue } from 'react-native-reanimated';

export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;
export const CROSSFADE_START = 9;
export const CROSSFADE_END = 11;

export function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

export interface UseZoomLevelResult {
  zoom: SharedValue<number>;
  overworldOpacity: SharedValue<number>;
  realMapOpacity: SharedValue<number>;
  setZoom: (next: number) => void;
}

export function useZoomLevel(initial = 8): UseZoomLevelResult {
  const zoom = useSharedValue(clampZoom(initial));
  const overworldOpacity = useDerivedValue(() => {
    'worklet';
    if (zoom.value <= CROSSFADE_START) return 1;
    if (zoom.value >= CROSSFADE_END) return 0;
    return 1 - (zoom.value - CROSSFADE_START) / (CROSSFADE_END - CROSSFADE_START);
  });
  const realMapOpacity = useDerivedValue(() => {
    'worklet';
    return 1 - overworldOpacity.value;
  });
  const setZoom = (next: number) => {
    zoom.value = clampZoom(next);
  };
  return { zoom, overworldOpacity, realMapOpacity, setZoom };
}
```

`useMapCamera.ts` exposes `useSharedValue` for `lat`, `lng`, `bearing`, plus a `centerOnBBox(bbox)` method that computes the centroid + zoom from bbox dimensions.

Tests for `useZoomLevel` (pure functions only, no RN renderer):

- `clampZoom(2)` → 6
- `clampZoom(20)` → 18
- The opacity math: at zoom 8 → overworld 1; at zoom 10 → overworld 0.5; at zoom 12 → 0. (Test the math via a standalone non-worklet helper extracted alongside.)

Extract the math into a pure helper to make it testable without Reanimated:

```typescript
export function computeOverworldOpacity(zoom: number): number {
  if (zoom <= CROSSFADE_START) return 1;
  if (zoom >= CROSSFADE_END) return 0;
  return 1 - (zoom - CROSSFADE_START) / (CROSSFADE_END - CROSSFADE_START);
}
```

- [ ] Implement hooks + extracted helper.
- [ ] Tests for clampZoom + computeOverworldOpacity.
- [ ] Run: `npm test src/features/map/__tests__/useZoomLevel.test.ts` — expect PASS.
- [ ] Commit: `feat(map): zoom + camera shared value hooks`

---

## Task 9: Cozy Map style JSON

**Files:**

- Create: `src/features/map/utils/cozyMapStyle.ts`
- Test: `src/features/map/__tests__/cozyMapStyle.test.ts`

Builder for a MapLibre style JSON string. Single source: MapTiler vector tiles (`https://api.maptiler.com/maps/streets-v2/style.json?key=...`). Overrides for Cozy palette per spec 7.3.

```typescript
import { env } from '@core/env';

export interface CozyMapStyle {
  version: 8;
  sources: Record<string, unknown>;
  layers: Array<Record<string, unknown>>;
  glyphs?: string;
}

export function buildCozyMapStyle(): CozyMapStyle {
  const key = env.maptilerApiKey;
  return {
    version: 8,
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${key}`,
    sources: {
      maptiler: {
        type: 'vector',
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${key}`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#FFF8EC' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'maptiler',
        'source-layer': 'water',
        paint: { 'fill-color': '#6BBFE2' },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'maptiler',
        'source-layer': 'landcover',
        filter: ['==', 'class', 'grass'],
        paint: { 'fill-color': '#2A9D8F' },
      },
      {
        id: 'roads-primary',
        type: 'line',
        source: 'maptiler',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'primary'],
        paint: { 'line-color': '#C62A38', 'line-width': 4 },
      },
      {
        id: 'roads-secondary',
        type: 'line',
        source: 'maptiler',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'secondary', 'tertiary'],
        paint: { 'line-color': '#A41E2A', 'line-width': 2.5 },
      },
    ],
  };
}
```

Tests: the produced JSON includes a `background` layer with the cream color, a `water` layer with sky-500, a `roads-primary` layer with primary-600, and the version field is 8.

- [ ] Tests first.
- [ ] Implement builder.
- [ ] Run: `npm test src/features/map/__tests__/cozyMapStyle.test.ts` — expect PASS.
- [ ] Commit: `feat(map): cozy map style json builder`

---

## Task 10: RealMapLayer (MapLibre)

**Files:**

- Create: `src/features/map/components/RealMapLayer.tsx`

```typescript
import MapLibreGL, { MapView, Camera, MarkerView } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { MilestoneNode, type Milestone } from '@features/milestones';
import { buildCozyMapStyle } from '../utils/cozyMapStyle';
import { bboxCenter, type BoundingBox } from '../utils/mercator';

MapLibreGL.setAccessToken(null); // MapTiler key embedded in style URL

export interface RealMapLayerProps {
  milestones: Milestone[];
  bbox: BoundingBox;
  zoom: number;
  checkedInIds: Set<string>;
  interactive: boolean;
  onZoomChange?: (zoom: number) => void;
}

export function RealMapLayer({
  milestones,
  bbox,
  zoom,
  checkedInIds,
  interactive,
  onZoomChange,
}: RealMapLayerProps) {
  const style = useMemo(() => buildCozyMapStyle(), []);
  const center = bboxCenter(bbox);

  return (
    <View
      style={{ position: 'absolute', inset: 0 }}
      pointerEvents={interactive ? 'auto' : 'none'}
    >
      <MapView
        style={{ flex: 1 }}
        mapStyle={JSON.stringify(style)}
        attributionEnabled
        logoEnabled={false}
        onRegionDidChange={(feature) => {
          const z = feature.properties.zoomLevel;
          if (typeof z === 'number') onZoomChange?.(z);
        }}
      >
        <Camera centerCoordinate={[center.lng, center.lat]} zoomLevel={zoom} animationMode="none" />
        {milestones
          .filter((m) => m.location?.coordinates)
          .map((m) => {
            const [lng, lat] = m.location!.coordinates;
            const completed = checkedInIds.has(m.id);
            return (
              <MarkerView key={m.id} coordinate={[lng, lat]} anchor={{ x: 0.5, y: 0.5 }}>
                <MilestoneNode
                  milestone={m}
                  state={completed ? 'completed' : 'available'}
                  isBoss={m.is_boss ?? false}
                />
              </MarkerView>
            );
          })}
      </MapView>
    </View>
  );
}
```

- [ ] Implement component.
- [ ] Run: `npm run typecheck` — expect PASS (MapLibre types installed).
- [ ] Run: `npm run lint` — expect PASS.
- [ ] [needs-dev-client] Visual smoke test deferred until EAS dev client is built.
- [ ] Commit: `feat(map): real map layer with maplibre + custom style`

---

## Task 11: PinchGestureHandler → zoom sync

**Files:**

- Create: `src/features/map/hooks/usePinchZoom.ts`

When Overworld is foreground, MapLibre is hidden behind it but still needs the camera in sync. Pinch on Overworld → mutate `zoom.value`. Above `CROSSFADE_END` MapLibre takes over interactions (its native gesture handlers will mutate `zoom` via `onRegionDidChange`).

```typescript
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { clampZoom } from './useZoomLevel';

export function usePinchZoom(zoom: SharedValue<number>) {
  const startZoom = useSharedValue(zoom.value);
  return Gesture.Pinch()
    .onStart(() => {
      'worklet';
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startZoom.value + Math.log2(e.scale);
      zoom.value = clampZoom(next);
    });
}
```

- [ ] Implement hook.
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Commit: `feat(map): pinch gesture → zoom shared value`

---

## Task 12: MapCrossfade orchestrator

**Files:**

- Create: `src/features/map/components/MapCrossfade.tsx`

```typescript
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useState } from 'react';
import { View } from 'react-native';

import type { Milestone } from '@features/milestones';
import { OverworldBackground } from './OverworldBackground';
import { OverworldLayer } from './OverworldLayer';
import { RealMapLayer } from './RealMapLayer';
import { useZoomLevel, CROSSFADE_END } from '../hooks/useZoomLevel';
import { usePinchZoom } from '../hooks/usePinchZoom';
import { useTripBoundingBox } from '../hooks/useTripBoundingBox';
import { pickWorldTheme, type WorldThemeId } from '../utils/worldThemes';

export interface MapCrossfadeProps {
  milestones: Milestone[];
  checkedInIds: Set<string>;
  destinationCountry?: string | null;
  onNodePress?: (m: Milestone) => void;
  onNodeLongPress?: (m: Milestone) => void;
}

export function MapCrossfade({
  milestones,
  checkedInIds,
  destinationCountry,
  onNodePress,
  onNodeLongPress,
}: MapCrossfadeProps) {
  const themeId: WorldThemeId = pickWorldTheme(destinationCountry);
  const bbox = useTripBoundingBox(milestones);
  const { zoom, overworldOpacity, realMapOpacity, setZoom } = useZoomLevel(8);
  const pinch = usePinchZoom(zoom);
  const [realMapZoom, setRealMapZoom] = useState(8);

  useAnimatedReaction(
    () => zoom.value,
    (z) => {
      runOnJS(setRealMapZoom)(z);
    },
  );

  const overworldStyle = useAnimatedStyle(() => ({
    opacity: overworldOpacity.value,
  }));
  const realMapStyle = useAnimatedStyle(() => ({
    opacity: realMapOpacity.value,
  }));

  if (!bbox) {
    return (
      <View style={{ flex: 1 }}>
        <OverworldBackground themeId={themeId} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, realMapStyle]}>
        <RealMapLayer
          milestones={milestones}
          bbox={bbox}
          zoom={realMapZoom}
          checkedInIds={checkedInIds}
          interactive={realMapZoom >= CROSSFADE_END}
          onZoomChange={setZoom}
        />
      </Animated.View>
      <GestureDetector gesture={pinch}>
        <Animated.View style={[{ position: 'absolute', inset: 0 }, overworldStyle]}>
          <OverworldBackground themeId={themeId} />
          <OverworldLayer
            milestones={milestones}
            bbox={bbox}
            checkedInIds={checkedInIds}
            onNodePress={onNodePress}
            onNodeLongPress={onNodeLongPress}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

- [ ] Implement component.
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Run: `npm run lint` — expect PASS.
- [ ] Commit: `feat(map): map crossfade orchestrator`

---

## Task 13: TripMapView + Path/Map toggle in TripDetailScreen

**Files:**

- Create: `src/features/map/components/TripMapView.tsx`
- Create: `src/features/map/components/MapModeToggle.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`

`MapModeToggle.tsx`: segmented control with two pill buttons (Path / Map), border-2 in primary-700, active state filled primary-500.

```typescript
export type MapMode = 'path' | 'map';

export interface MapModeToggleProps {
  mode: MapMode;
  onChange: (next: MapMode) => void;
}
```

`TripMapView.tsx`: thin wrapper rendering `<MapCrossfade ...>` at 100% of available area (full-bleed inside the trip screen).

Modify `TripDetailScreen.tsx`:

- Add `useState<MapMode>('path')`.
- Render `<MapModeToggle>` above the path/map block.
- When `mode === 'map'`, render `<TripMapView>` instead of `<PathView>`.
- Keep all milestone CRUD + checkin logic shared (passes `checkedInIds` + handlers to both views).

```typescript
const [mode, setMode] = useState<MapMode>('path');
// ...
{milestones.length === 0 ? (
  /* empty state unchanged */
) : (
  <View className="mb-6">
    <MapModeToggle mode={mode} onChange={setMode} />
    {mode === 'path' ? (
      <PathView
        milestones={milestones}
        checkedInIds={checkedInSet}
        onNodeLongPress={handleNodeLongPress}
      />
    ) : (
      <View style={{ height: 500 }}>
        <TripMapView
          milestones={milestones}
          checkedInIds={checkedInSet}
          destinationCountry={trip.destination_country}
          onNodeLongPress={handleNodeLongPress}
        />
      </View>
    )}
    {/* + Add milestone button */}
  </View>
)}
```

- [ ] Implement toggle + view + integration.
- [ ] Run: `npm run typecheck && npm run lint` — expect PASS.
- [ ] Commit: `feat(map): trip map view + path/map toggle in trip detail`

---

## Task 14: Offline pack download (MVP)

**Files:**

- Create: `src/features/map/api/offlinePacks.ts`

Per spec 7.6, MapLibre offline packs for `bbox(trip)`, zoom 8-16, ~50-200 MB per trip. For Phase 3 MVP: expose `downloadTripPack(tripId, bbox)` + `deleteTripPack(tripId)` + `listPacks()`. Wire a "Download offline" button in `TripDetailScreen` later (Phase 4 polish).

```typescript
import MapLibreGL from '@maplibre/maplibre-react-native';
import { buildCozyMapStyle } from '../utils/cozyMapStyle';
import { padBoundingBox, type BoundingBox } from '../utils/mercator';

export async function downloadTripPack(tripId: string, bbox: BoundingBox) {
  const padded = padBoundingBox(bbox, 0.3);
  return MapLibreGL.offlineManager.createPack({
    name: `trip-${tripId}`,
    styleURL: JSON.stringify(buildCozyMapStyle()),
    bounds: [
      [padded.minLng, padded.minLat],
      [padded.maxLng, padded.maxLat],
    ],
    minZoom: 8,
    maxZoom: 16,
  });
}

export async function deleteTripPack(tripId: string) {
  await MapLibreGL.offlineManager.deletePack(`trip-${tripId}`);
}

export async function listPacks() {
  return MapLibreGL.offlineManager.getPacks();
}
```

- [ ] Verify the actual MapLibre RN API (the function names above are from MapLibre GL JS; the RN binding may use `createOfflineRegion`). Use `Read` on `node_modules/@maplibre/maplibre-react-native/src/offline/...` to confirm before committing.
- [ ] Implement with the actual API.
- [ ] Run: `npm run typecheck` — expect PASS.
- [ ] Commit: `feat(map): offline pack download api`

---

## Task 15: i18n keys

**Files:**

- Modify: `src/core/i18n/locales/en.json`
- Modify: `src/core/i18n/locales/fr.json`

Add:

```json
{
  "map": {
    "toggle": { "path": "Path", "map": "Map" },
    "themes": { "adventure-generic": "Adventure", "usa-desert": "Desert" },
    "offline": {
      "download": "Download offline",
      "downloading": "Downloading…",
      "downloaded": "Offline ready",
      "deleteConfirm": "Remove offline data for this trip?"
    },
    "empty": "Add milestones to see your trip on the map."
  }
}
```

French equivalents in `fr.json`. Wire `t('map.toggle.path')` / `t('map.toggle.map')` in `MapModeToggle`.

- [ ] Update locale files.
- [ ] Run: `npm test` — expect existing i18n tests still PASS.
- [ ] Commit: `feat(i18n): map module keys (en + fr)`

---

## Task 16: Barrel exports + final validation

**Files:**

- Create: `src/features/map/index.ts`

```typescript
export { TripMapView } from './components/TripMapView';
export { MapModeToggle } from './components/MapModeToggle';
export type { MapMode } from './components/MapModeToggle';
export { useTripBoundingBox } from './hooks/useTripBoundingBox';
export { useZoomLevel, computeOverworldOpacity, clampZoom } from './hooks/useZoomLevel';
export { downloadTripPack, deleteTripPack, listPacks } from './api/offlinePacks';
```

- [ ] Implement barrel.
- [ ] Run inline validator: `npm run typecheck && npm run lint && npm test && npm run credits:check`.
- [ ] Expect: all PASS.
- [ ] Commit: `feat(map): module barrel + final validation`
- [ ] Run: `git push origin main`.

---

## Completion criteria

- `@maplibre/maplibre-react-native` + `@shopify/react-native-skia` installed and registered in `app.json`.
- New `src/features/map` module: utils + hooks + components + tests.
- 2 world themes (Adventure Generic + USA Desert) with placeholder backgrounds.
- Mercator projection + bounding box helpers tested (≥6 unit tests).
- Clustering util tested (≥3 unit tests).
- Zoom math (clamp + crossfade opacity curve) tested (≥4 unit tests).
- Cozy Map style JSON builder tested (≥3 unit tests).
- `TripDetailScreen` toggles between Path (Phase 2) and Map (Phase 3).
- Map view crossfades Overworld → Real Map between zoom 9–11 via pinch gesture.
- i18n keys present in en + fr, no hardcoded strings.
- Typecheck + lint + test + credits all PASS on CI.
- 80+ tests passing across the project.

**Deferred to later phases (explicit):**

- Drifting cloud animation (Phase 8 polish).
- Real artwork for world theme backgrounds (Phase 8).
- 3 additional themes: Europe Forest / Asia Sakura / Tropical Beach (Phase 8).
- Live avatar layer on Overworld (Phase 5 realtime).
- Cluster spread animation on tap (Phase 7 cherry-on-top).
- Offline pack auto-download T-14j (Phase 4 smart reminders).
- Visual smoke tests of MapLibre rendering ([needs-dev-client] — Phase 0 T15).

**Estimated**: 16 tasks, ~3 weeks per spec (Sem 6-8), ~2500 lines of code.
