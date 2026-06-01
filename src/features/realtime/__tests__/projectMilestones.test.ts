import type { BoundingBox } from '@features/map/utils/mercator';

import { projectMilestones } from '../utils/projectMilestones';

const bbox: BoundingBox = { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
const ms = [
  { id: 'a', lat: 0.2, lng: 0.2 },
  { id: 'b', lat: 0.8, lng: 0.8 },
  { id: 'c', lat: null, lng: null },
];

describe('projectMilestones', () => {
  it('positions geocoded milestones inside the viewport and drops ungeocoded', () => {
    const out = projectMilestones(ms, bbox, 400, 600);
    expect(out.map((p) => p.id)).toEqual(['a', 'b']);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(400);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });

  it('orders by geography (eastern point has larger x; northern point has smaller y)', () => {
    // a = (lat 0.2, lng 0.2) south-west; b = (lat 0.8, lng 0.8) north-east
    const [a, b] = projectMilestones(ms, bbox, 400, 600);
    expect(a.x).toBeLessThan(b.x); // a is west of b
    expect(a.y).toBeGreaterThan(b.y); // a is south of b → larger y (Mercator y grows southward)
  });
});
