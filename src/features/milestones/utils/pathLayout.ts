/**
 * Path layout — Duolingo-style indentation cycle + Bézier control points.
 * Port of sanidhyy/duolingo-clone `tileLeftClassNames` algorithm.
 */

export interface NodePosition {
  x: number;
  y: number;
}

export const INDENTATION_PATTERN = [0, 1, 2, 1, 0, -1, -2, -1] as const;
export const HORIZONTAL_STEP = 56; // px per indentation unit
export const VERTICAL_STEP = 130; // px between consecutive nodes
export const PATH_HORIZONTAL_CENTER = 160; // px, half of typical scroll view width
export const PATH_TOP_PADDING = 80;
export const PATH_BOTTOM_PADDING = 120;
export const NODE_RADIUS = 36;

export function nodePosition(index: number): NodePosition {
  const pattern = INDENTATION_PATTERN[index % INDENTATION_PATTERN.length];
  return {
    x: PATH_HORIZONTAL_CENTER + pattern * HORIZONTAL_STEP,
    y: PATH_TOP_PADDING + index * VERTICAL_STEP,
  };
}

export interface BezierControlPoints {
  control1: NodePosition;
  control2: NodePosition;
}

export function bezierControlPoints(from: NodePosition, to: NodePosition): BezierControlPoints {
  const midY = (from.y + to.y) / 2;
  return {
    control1: { x: from.x, y: midY },
    control2: { x: to.x, y: midY },
  };
}

export function totalPathHeight(milestoneCount: number): number {
  if (milestoneCount === 0) return PATH_TOP_PADDING + PATH_BOTTOM_PADDING;
  return PATH_TOP_PADDING + (milestoneCount - 1) * VERTICAL_STEP + PATH_BOTTOM_PADDING;
}

export function svgPathBetween(from: NodePosition, to: NodePosition): string {
  const { control1, control2 } = bezierControlPoints(from, to);
  return `M ${from.x},${from.y} C ${control1.x},${control1.y} ${control2.x},${control2.y} ${to.x},${to.y}`;
}
