import { ScrollView, View } from 'react-native';
import Svg from 'react-native-svg';

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
      </View>
    </ScrollView>
  );
}
