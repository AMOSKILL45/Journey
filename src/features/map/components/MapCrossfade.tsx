import { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';

import type { Milestone } from '@features/milestones';

import { usePinchZoom } from '../hooks/usePinchZoom';
import { useTripBoundingBox } from '../hooks/useTripBoundingBox';
import { CROSSFADE_END, useZoomLevel } from '../hooks/useZoomLevel';
import { pickWorldTheme, type WorldThemeId } from '../utils/worldThemes';

import { OverworldBackground } from './OverworldBackground';
import { OverworldLayer } from './OverworldLayer';
import { RealMapLayer } from './RealMapLayer';

const INITIAL_ZOOM = 8;
const FULL_BLEED = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export interface MapCrossfadeProps {
  milestones: readonly Milestone[];
  checkedInIds: ReadonlySet<string>;
  destinationCountry?: string | null;
  onNodePress?: (milestone: Milestone) => void;
  onNodeLongPress?: (milestone: Milestone) => void;
  themeIdOverride?: WorldThemeId;
}

/**
 * Stacks the real MapLibre map under the Skia/SVG overworld and crossfades
 * between them driven by a single zoom shared value. Pinch on the overworld
 * pushes the zoom forward (worklet-driven, no JS-bridge round trip); past
 * CROSSFADE_END, the real map becomes interactive and its native gestures
 * take over via onZoomChange.
 */
export function MapCrossfade({
  milestones,
  checkedInIds,
  destinationCountry,
  onNodePress,
  onNodeLongPress,
  themeIdOverride,
}: MapCrossfadeProps) {
  const themeId = themeIdOverride ?? pickWorldTheme(destinationCountry);
  const bbox = useTripBoundingBox(milestones);
  const { zoom, overworldOpacity, realMapOpacity, setZoom } = useZoomLevel(INITIAL_ZOOM);
  const pinch = usePinchZoom(zoom);
  const [realMapZoom, setRealMapZoom] = useState(INITIAL_ZOOM);
  const [realMapInteractive, setRealMapInteractive] = useState(false);

  useAnimatedReaction(
    () => zoom.value,
    (currentZoom) => {
      runOnJS(setRealMapZoom)(currentZoom);
      runOnJS(setRealMapInteractive)(currentZoom >= CROSSFADE_END);
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
      <Animated.View style={[FULL_BLEED, realMapStyle]}>
        <RealMapLayer
          milestones={milestones}
          bbox={bbox}
          zoom={realMapZoom}
          checkedInIds={checkedInIds}
          interactive={realMapInteractive}
          onZoomChange={setZoom}
        />
      </Animated.View>
      <GestureDetector gesture={pinch}>
        <Animated.View style={[FULL_BLEED, overworldStyle]} pointerEvents="box-none">
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
