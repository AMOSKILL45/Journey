import { CLUSTER_THRESHOLD_PX, cluster } from '../utils/clustering';

describe('clustering', () => {
  it('returns an empty list for no input', () => {
    expect(cluster([])).toEqual([]);
  });

  it('puts a single point in its own cluster', () => {
    const result = cluster([{ data: 'a', x: 10, y: 10 }]);
    expect(result).toHaveLength(1);
    expect(result[0].members).toEqual(['a']);
    expect(result[0].cx).toBe(10);
    expect(result[0].cy).toBe(10);
  });

  it('merges points within the default 40px threshold', () => {
    const result = cluster([
      { data: 'a', x: 100, y: 100 },
      { data: 'b', x: 120, y: 100 },
      { data: 'c', x: 110, y: 110 },
    ]);
    expect(result).toHaveLength(1);
    expect(new Set(result[0].members)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('keeps far-apart points in separate clusters', () => {
    const result = cluster([
      { data: 'a', x: 0, y: 0 },
      { data: 'b', x: 200, y: 0 },
      { data: 'c', x: 0, y: 200 },
    ]);
    expect(result).toHaveLength(3);
  });

  it('updates the running centroid as new members join', () => {
    const result = cluster(
      [
        { data: 'a', x: 0, y: 0 },
        { data: 'b', x: 20, y: 0 },
        { data: 'c', x: 35, y: 0 },
      ],
      40,
    );
    expect(result).toHaveLength(1);
    expect(result[0].members).toHaveLength(3);
    // running mean of 0, 20, 35 = 55/3
    expect(result[0].cx).toBeCloseTo(55 / 3, 5);
  });

  it('starts a new cluster when the centroid has drifted past the threshold', () => {
    // a + b cluster at cx=15; c at x=60 is 45px away from cx=15 → above 40
    const result = cluster(
      [
        { data: 'a', x: 0, y: 0 },
        { data: 'b', x: 30, y: 0 },
        { data: 'c', x: 60, y: 0 },
      ],
      40,
    );
    expect(result).toHaveLength(2);
    expect(result[0].members).toEqual(['a', 'b']);
    expect(result[1].members).toEqual(['c']);
  });

  it('respects a custom threshold', () => {
    const points = [
      { data: 'a', x: 0, y: 0 },
      { data: 'b', x: 30, y: 0 },
    ];
    expect(cluster(points, 20)).toHaveLength(2);
    expect(cluster(points, 40)).toHaveLength(1);
  });

  it('exports a sensible default threshold', () => {
    expect(CLUSTER_THRESHOLD_PX).toBe(40);
  });
});
