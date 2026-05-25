import {
  bezierControlPoints,
  INDENTATION_PATTERN,
  nodePosition,
  svgPathBetween,
  totalPathHeight,
} from '../utils/pathLayout';

describe('pathLayout', () => {
  it('returns positions following the indentation cycle', () => {
    const positions = Array.from({ length: 9 }).map((_, i) => nodePosition(i));
    // Pattern is [0,1,2,1,0,-1,-2,-1] — index 8 cycles back to pattern[0] = 0
    expect(positions[0].x).toBe(positions[8].x);
    expect(positions[1].x).toBeGreaterThan(positions[0].x);
    expect(positions[2].x).toBeGreaterThan(positions[1].x);
    expect(positions[5].x).toBeLessThan(positions[0].x);
  });

  it('produces vertical progression', () => {
    expect(nodePosition(0).y).toBeLessThan(nodePosition(1).y);
    expect(nodePosition(5).y).toBeLessThan(nodePosition(10).y);
  });

  it('uses the documented INDENTATION_PATTERN of length 8', () => {
    expect(INDENTATION_PATTERN).toHaveLength(8);
  });

  it('computes bezier control points at midpoint Y', () => {
    const from = { x: 100, y: 100 };
    const to = { x: 200, y: 300 };
    const { control1, control2 } = bezierControlPoints(from, to);
    expect(control1).toEqual({ x: 100, y: 200 });
    expect(control2).toEqual({ x: 200, y: 200 });
  });

  it('generates SVG path strings', () => {
    const from = { x: 100, y: 100 };
    const to = { x: 200, y: 300 };
    const path = svgPathBetween(from, to);
    expect(path).toBe('M 100,100 C 100,200 200,200 200,300');
  });

  it('computes total path height with padding', () => {
    expect(totalPathHeight(0)).toBe(80 + 120);
    expect(totalPathHeight(1)).toBe(80 + 120);
    expect(totalPathHeight(3)).toBe(80 + 2 * 130 + 120);
  });
});
