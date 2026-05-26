import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import { View } from 'react-native';

import { MilestoneNode, type Milestone, type MilestoneNodeState } from '@features/milestones';

import { buildCozyMapStyle } from '../utils/cozyMapStyle';
import { bboxCenter, type BoundingBox } from '../utils/mercator';

interface ViewStateChangeEvent {
  zoom: number;
  center: [number, number];
  bearing: number;
  pitch: number;
}

export interface RealMapLayerProps {
  milestones: readonly Milestone[];
  bbox: BoundingBox;
  zoom: number;
  checkedInIds: ReadonlySet<string>;
  interactive: boolean;
  onZoomChange?: (zoom: number) => void;
}

/**
 * MapLibre native map with the Cozy palette. Markers re-use the Phase 2
 * MilestoneNode so the visual identity is identical to the overworld layer
 * — the crossfade therefore feels like a zoom rather than a hard cut.
 *
 * `interactive` is driven by the parent crossfade so MapLibre only steals
 * gestures once it is the foreground layer (zoom >= CROSSFADE_END).
 */
export function RealMapLayer({
  milestones,
  bbox,
  zoom,
  checkedInIds,
  interactive,
  onZoomChange,
}: RealMapLayerProps) {
  const styleJson = useMemo(() => JSON.stringify(buildCozyMapStyle()), []);
  const center = bboxCenter(bbox);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents={interactive ? 'auto' : 'none'}
    >
      <Map
        style={{ flex: 1 }}
        mapStyle={styleJson}
        logo={false}
        attribution
        onRegionDidChange={(event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
          const next = event.nativeEvent?.zoom;
          if (typeof next === 'number' && onZoomChange) {
            onZoomChange(next);
          }
        }}
      >
        <Camera center={[center.lng, center.lat]} zoom={zoom} />
        {milestones.map((milestone) => {
          if (milestone.lat == null || milestone.lng == null) return null;
          const state: MilestoneNodeState = checkedInIds.has(milestone.id)
            ? 'completed'
            : 'available';
          return (
            <Marker
              key={milestone.id}
              id={milestone.id}
              lngLat={[milestone.lng, milestone.lat]}
              anchor="center"
            >
              <View>
                <MilestoneNode milestone={milestone} state={state} />
              </View>
            </Marker>
          );
        })}
      </Map>
    </View>
  );
}
