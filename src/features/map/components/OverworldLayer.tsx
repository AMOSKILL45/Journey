import { useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import {
  MilestoneEdge,
  MilestoneNode,
  type Milestone,
  type MilestoneNodeState,
} from '@features/milestones';

import { type BoundingBox } from '../utils/mercator';
import { projectMilestones } from '../utils/projectMilestones';

import { LiveAvatarsLayer, type LiveMember } from './LiveAvatarsLayer';

const NODE_DIAMETER = 72;

export interface OverworldLayerProps {
  milestones: readonly Milestone[];
  bbox: BoundingBox;
  checkedInIds: ReadonlySet<string>;
  liveMembers?: readonly LiveMember[];
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
  liveMembers,
  onNodePress,
  onNodeLongPress,
}: OverworldLayerProps) {
  const { width, height } = useWindowDimensions();

  const byId = new Map(milestones.map((m) => [m.id, m]));
  const positioned: PositionedMilestone[] = projectMilestones(
    milestones.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng })),
    bbox,
    width,
    height,
  )
    .map<PositionedMilestone | null>((p) => {
      const milestone = byId.get(p.id);
      return milestone ? { milestone, x: p.x, y: p.y } : null;
    })
    .filter(isPositioned);

  // Place each present member: fresh GPS point wins, else their milestone node.
  const nodePos = new Map(positioned.map((e) => [e.milestone.id, { x: e.x, y: e.y }]));
  const placements = (liveMembers ?? []).flatMap((m) => {
    if (m.liveLat != null && m.liveLng != null) {
      const [p] = projectMilestones(
        [{ id: m.user_id, lat: m.liveLat, lng: m.liveLng }],
        bbox,
        width,
        height,
      );
      return p ? [{ member: m, x: p.x, y: p.y }] : [];
    }
    const np = m.current_milestone_id ? nodePos.get(m.current_milestone_id) : undefined;
    return np ? [{ member: m, x: np.x, y: np.y }] : [];
  });

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
      <LiveAvatarsLayer placements={placements} />
    </View>
  );
}
