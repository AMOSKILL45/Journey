/**
 * Screen-distance clustering. Hands back the absolute pixel centroid +
 * member payloads, ready for a <PixelCluster> marker.
 *
 * The algorithm is greedy (O(n²) worst case) and tracks a running centroid
 * so transitively-close points still merge — appropriate for the dozens-of-
 * milestones scale we expect in v1.0. A grid index would be needed for the
 * "all trips on the discovery map" view that lands post-launch.
 */

export interface ClusterablePoint<T> {
  data: T;
  x: number;
  y: number;
}

export interface Cluster<T> {
  cx: number;
  cy: number;
  members: T[];
}

export const CLUSTER_THRESHOLD_PX = 40;

export function cluster<T>(
  points: readonly ClusterablePoint<T>[],
  thresholdPx: number = CLUSTER_THRESHOLD_PX,
): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];
  for (const point of points) {
    const target = clusters.find(
      (existing) => Math.hypot(existing.cx - point.x, existing.cy - point.y) < thresholdPx,
    );
    if (target) {
      target.members.push(point.data);
      const n = target.members.length;
      target.cx = (target.cx * (n - 1) + point.x) / n;
      target.cy = (target.cy * (n - 1) + point.y) / n;
    } else {
      clusters.push({ cx: point.x, cy: point.y, members: [point.data] });
    }
  }
  return clusters;
}
