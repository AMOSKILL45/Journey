import { useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import {
  MilestoneEdge,
  MilestoneNode,
  type Milestone,
  type MilestoneNodeState,
} from '@features/milestones';

import { withCoords } from '../types';
import { latLngToPixel, padBoundingBox, type BoundingBox } from '../utils/mercator';

const REFERENCE_ZOOM = 8;
const NODE_DIAMETER = 72;
const BBOX_PADDING_FRACTION = 0.2;

export interface OverworldLayerProps {
  milestones: readonly Milestone[];
  bbox: BoundingBox;
  checkedInIds: ReadonlySet<string>;
  onNodePress?: (milestone: Milestone) => void;
  onNodeLongPress?: (milestone: Milestone) => void;
}

interface PositionedMilestone {
  milestone: Milestone;
  x: number;
  y: number;
}

function isPositioned(value: PositionedMilestone | null): value is PositionedMilestone {
  return value !== null;
}

/**
 * Positions every geocoded milestone in screen space using the Web Mercator
 * projection at a fixed reference zoom, normalised against the trip's
 * padded bounding box. The same lat/lng → x/y math is used by the real
 * MapLibre layer at zoom 11+ so nodes do not jump during the crossfade.
 */
export function OverworldLayer({
  milestones,
  bbox,
  checkedInIds,
  onNodePress,
  onNodeLongPress,
}: OverworldLayerProps) {
  const { width, height } = useWindowDimensions();
  const padded = padBoundingBox(bbox, BBOX_PADDING_FRACTION);

  const nw = latLngToPixel({ lat: padded.maxLat, lng: padded.minLng }, REFERENCE_ZOOM);
  const se = latLngToPixel({ lat: padded.minLat, lng: padded.maxLng }, REFERENCE_ZOOM);
  const projectedWidth = Math.max(se.x - nw.x, 1);
  const projectedHeight = Math.max(se.y - nw.y, 1);
  const scale = Math.min(width / projectedWidth, height / projectedHeight);
  const offsetX = (width - projectedWidth * scale) / 2;
  const offsetY = (height - projectedHeight * scale) / 2;

  const positioned: PositionedMilestone[] = milestones
    .map<PositionedMilestone | null>((milestone) => {
      const m = withCoords(milestone);
      if (m.lat == null || m.lng == null) return null;
      const p = latLngToPixel({ lat: m.lat, lng: m.lng }, REFERENCE_ZOOM);
      return {
        milestone,
        x: (p.x - nw.x) * scale + offsetX,
        y: (p.y - nw.y) * scale + offsetY,
      };
    })
    .filter(isPositioned);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="box-none"
    >
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        {positioned.slice(0, -1).map((entry, index) => {
          const next = positioned[index + 1];
          const fromCompleted = checkedInIds.has(entry.milestone.id);
          return (
            <MilestoneEdge
              key={`${entry.milestone.id}-${next.milestone.id}`}
              from={{ x: entry.x, y: entry.y }}
              to={{ x: next.x, y: next.y }}
              state={fromCompleted ? 'completed' : 'locked'}
            />
          );
        })}
      </Svg>
      {positioned.map((entry) => {
        const state: MilestoneNodeState = checkedInIds.has(entry.milestone.id)
          ? 'completed'
          : 'available';
        return (
          <View
            key={entry.milestone.id}
            style={{
              position: 'absolute',
              left: entry.x - NODE_DIAMETER / 2,
              top: entry.y - NODE_DIAMETER / 2,
            }}
          >
            <MilestoneNode
              milestone={entry.milestone}
              state={state}
              onPress={onNodePress ? () => onNodePress(entry.milestone) : undefined}
              onLongPress={onNodeLongPress ? () => onNodeLongPress(entry.milestone) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}
