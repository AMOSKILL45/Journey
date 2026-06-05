import { ScrollView, View } from 'react-native';
import Svg from 'react-native-svg';

import { DistancePill, legKey, useTripDistances } from '@features/enrichment';

import type { Milestone } from '../api/milestones';
import { nodePosition, NODE_RADIUS, totalPathHeight } from '../utils/pathLayout';

import { MilestoneEdge, type EdgeState } from './MilestoneEdge';
import { MilestoneNode, type MilestoneNodeState } from './MilestoneNode';

export interface PathViewProps {
  milestones: Milestone[];
  checkedInIds: Set<string>;
  onNodePress?: (m: Milestone) => void;
  onNodeLongPress?: (m: Milestone) => void;
}

const PATH_WIDTH = 320;
// Half-extents used to center a distance pill on an edge midpoint.
const PILL_HALF_WIDTH = 36;
const PILL_HALF_HEIGHT = 10;

function computeStates(milestones: Milestone[], checkedInIds: Set<string>) {
  // First non-checked-in milestone = current, all before = completed, after = locked
  let foundCurrent = false;
  return milestones.map((m): { nodeState: MilestoneNodeState; edgeState: EdgeState } => {
    const checkedIn = checkedInIds.has(m.id);
    if (checkedIn) return { nodeState: 'completed', edgeState: 'completed' };
    if (!foundCurrent) {
      foundCurrent = true;
      return { nodeState: 'current', edgeState: 'available' };
    }
    return { nodeState: 'locked', edgeState: 'locked' };
  });
}

export function PathView({
  milestones,
  checkedInIds,
  onNodePress,
  onNodeLongPress,
}: PathViewProps) {
  const states = computeStates(milestones, checkedInIds);
  const height = totalPathHeight(milestones.length);

  // Trip-level enrichment trigger: fires the single enrich_milestone call (fills weather_cache
  // AND milestone_legs) and exposes the keyed legs for the per-edge distance pills.
  const tripId = milestones[0]?.trip_id;
  const { byKey } = useTripDistances(tripId ?? '', { autoEnrich: Boolean(tripId) });

  return (
    <ScrollView contentContainerStyle={{ height, width: '100%' }}>
      <View style={{ height, width: PATH_WIDTH, alignSelf: 'center' }}>
        <Svg width={PATH_WIDTH} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {milestones.slice(0, -1).map((m, i) => {
            const from = nodePosition(i);
            const to = nodePosition(i + 1);
            return (
              <MilestoneEdge
                key={`edge-${m.id}`}
                from={from}
                to={to}
                state={states[i + 1].edgeState}
              />
            );
          })}
        </Svg>
        {milestones.map((m, i) => {
          const pos = nodePosition(i);
          const sizeBoost = m.is_boss ? 1.35 : 1;
          const size = NODE_RADIUS * 2 * sizeBoost;
          return (
            <View
              key={m.id}
              style={{
                position: 'absolute',
                left: pos.x - size / 2,
                top: pos.y - size / 2,
              }}
            >
              <MilestoneNode
                milestone={m}
                state={states[i].nodeState}
                onPress={() => onNodePress?.(m)}
                onLongPress={() => onNodeLongPress?.(m)}
              />
            </View>
          );
        })}
        {milestones.slice(0, -1).map((m, i) => {
          const leg = byKey.get(legKey(m.id, milestones[i + 1].id));
          if (!leg) return null;
          const from = nodePosition(i);
          const to = nodePosition(i + 1);
          return (
            <View
              key={`pill-${m.id}`}
              style={{
                position: 'absolute',
                left: (from.x + to.x) / 2 - PILL_HALF_WIDTH,
                top: (from.y + to.y) / 2 - PILL_HALF_HEIGHT,
              }}
              pointerEvents="none"
            >
              <DistancePill distanceM={leg.distance_m} durationS={leg.duration_s} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
