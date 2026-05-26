import { useCallback, useMemo } from 'react';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import { bboxCenter, type BoundingBox, type LatLng } from '../utils/mercator';

import { clampZoom } from './useZoomLevel';

const DEFAULT_CENTER: LatLng = { lat: 0, lng: 0 };

export interface UseMapCameraOptions {
  initialCenter?: LatLng;
  initialZoom?: number;
  initialBearing?: number;
}

export interface UseMapCameraResult {
  lat: SharedValue<number>;
  lng: SharedValue<number>;
  bearing: SharedValue<number>;
  setCenter: (center: LatLng) => void;
  setBearing: (bearing: number) => void;
  centerOnBBox: (bbox: BoundingBox) => number;
}

/**
 * Holds the camera state (lat/lng/bearing) as Reanimated shared values so
 * worklet-driven crossfades and gesture handlers can read/write without
 * crossing the JS thread. Zoom lives in `useZoomLevel` so the crossfade can
 * react to a single source of truth.
 *
 * `centerOnBBox` returns the suggested zoom for the bounding box so the
 * caller can feed it into `setZoom` from `useZoomLevel`.
 */
export function useMapCamera({
  initialCenter = DEFAULT_CENTER,
  initialBearing = 0,
}: UseMapCameraOptions = {}): UseMapCameraResult {
  const lat = useSharedValue(initialCenter.lat);
  const lng = useSharedValue(initialCenter.lng);
  const bearing = useSharedValue(initialBearing);

  const setCenter = useCallback(
    (center: LatLng) => {
      lat.value = center.lat;
      lng.value = center.lng;
    },
    [lat, lng],
  );

  const setBearing = useCallback(
    (next: number) => {
      bearing.value = next;
    },
    [bearing],
  );

  const centerOnBBox = useCallback(
    (bbox: BoundingBox) => {
      const center = bboxCenter(bbox);
      lat.value = center.lat;
      lng.value = center.lng;
      return suggestedZoomForBBox(bbox);
    },
    [lat, lng],
  );

  return useMemo(
    () => ({ lat, lng, bearing, setCenter, setBearing, centerOnBBox }),
    [lat, lng, bearing, setCenter, setBearing, centerOnBBox],
  );
}

/**
 * Crude heuristic mapping bbox extent to a Web Mercator zoom level. Good
 * enough to frame a trip the first time the user opens it — the user can
 * pinch from there. Anything that needs pixel-perfect framing should use
 * the underlying MapLibre `fitBounds` API instead.
 */
export function suggestedZoomForBBox(bbox: BoundingBox): number {
  const extent = Math.max(bbox.maxLat - bbox.minLat, bbox.maxLng - bbox.minLng);
  if (extent === 0) return clampZoom(14);
  // 360° => zoom 0, 180° => 1, 90° => 2, … 0.35° ≈ zoom 10
  const zoom = Math.log2(360 / extent);
  return clampZoom(Math.round(zoom));
}
