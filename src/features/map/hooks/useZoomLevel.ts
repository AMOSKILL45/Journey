import { type SharedValue, useDerivedValue, useSharedValue } from 'react-native-reanimated';

/**
 * Zoom range for the dual-layer map system. The overworld layer is fully
 * visible at MIN_ZOOM..CROSSFADE_START, the real map takes over at
 * CROSSFADE_END..MAX_ZOOM, and the two crossfade linearly in between.
 */
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;
export const CROSSFADE_START = 9;
export const CROSSFADE_END = 11;

export function clampZoom(zoom: number): number {
  if (zoom < MIN_ZOOM) return MIN_ZOOM;
  if (zoom > MAX_ZOOM) return MAX_ZOOM;
  return zoom;
}

// Pure helpers extracted from useDerivedValue so they can be unit-tested
// without a React renderer or the Reanimated worklet runtime.
export function computeOverworldOpacity(zoom: number): number {
  if (zoom <= CROSSFADE_START) return 1;
  if (zoom >= CROSSFADE_END) return 0;
  return 1 - (zoom - CROSSFADE_START) / (CROSSFADE_END - CROSSFADE_START);
}

export function computeRealMapOpacity(zoom: number): number {
  return 1 - computeOverworldOpacity(zoom);
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
