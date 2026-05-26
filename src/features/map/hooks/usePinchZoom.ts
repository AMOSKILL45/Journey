import { Gesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import { MAX_ZOOM, MIN_ZOOM } from './useZoomLevel';

/**
 * Pinch gesture → zoom shared value. The scale → zoom mapping is `log2`
 * so doubling the pinch span ≈ +1 zoom level (matching the standard Web
 * Mercator semantics used by MapLibre's native gesture).
 *
 * Result is a Gesture you can mount with a <GestureDetector>.
 */
export function usePinchZoom(zoom: SharedValue<number>) {
  const startZoom = useSharedValue(zoom.value);

  return Gesture.Pinch()
    .onStart(() => {
      'worklet';
      startZoom.value = zoom.value;
    })
    .onUpdate((event) => {
      'worklet';
      const next = startZoom.value + Math.log2(Math.max(event.scale, 0.0001));
      zoom.value = next < MIN_ZOOM ? MIN_ZOOM : next > MAX_ZOOM ? MAX_ZOOM : next;
    });
}
