import { useMemo } from 'react';

import type { Milestone } from '@features/milestones';

import { computeBoundingBox, type BoundingBox, type LatLng } from '../utils/mercator';

/**
 * Derives a Web Mercator bounding box from a trip's milestones. Skips
 * milestones whose location has not been geocoded yet (lat / lng both null).
 * Returns null when no milestone has coordinates — callers should treat that
 * as "show empty state" rather than zoom to the equator.
 */
export function useTripBoundingBox(milestones: readonly Milestone[]): BoundingBox | null {
  return useMemo(() => {
    const points: LatLng[] = [];
    for (const m of milestones) {
      if (m.lat != null && m.lng != null) {
        points.push({ lat: m.lat, lng: m.lng });
      }
    }
    return computeBoundingBox(points);
  }, [milestones]);
}
