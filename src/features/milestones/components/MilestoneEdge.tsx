import { Path } from 'react-native-svg';

import { colors } from '@core/theme';

import { svgPathBetween, type NodePosition } from '../utils/pathLayout';

export type EdgeState = 'locked' | 'available' | 'completed';

export interface MilestoneEdgeProps {
  from: NodePosition;
  to: NodePosition;
  state: EdgeState;
}

const STROKE_BY_STATE: Record<EdgeState, string> = {
  locked: colors.textDisabled,
  available: colors.sky[500],
  completed: colors.success,
};

const DASH_BY_STATE: Record<EdgeState, string | undefined> = {
  locked: '6,4',
  available: '6,4',
  completed: undefined,
};

export function MilestoneEdge({ from, to, state }: MilestoneEdgeProps) {
  return (
    <Path
      d={svgPathBetween(from, to)}
      stroke={STROKE_BY_STATE[state]}
      strokeWidth={state === 'completed' ? 6 : 5}
      strokeLinecap="round"
      strokeDasharray={DASH_BY_STATE[state]}
      fill="none"
    />
  );
}
