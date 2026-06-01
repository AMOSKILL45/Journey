import { latLngToPixel, padBoundingBox, type BoundingBox } from './mercator';

// Single source of truth for overworld projection: OverworldLayer (nodes) and
// LiveAvatarsLayer (avatars) both use this so avatars sit exactly on their node.
export const REFERENCE_ZOOM = 8;
export const BBOX_PADDING_FRACTION = 0.2;

export interface ProjectedPoint {
  id: string;
  x: number;
  y: number;
}

interface Geo {
  id: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Project geocoded points into screen space via Web Mercator at a fixed
 * reference zoom, normalised against the trip's padded bounding box.
 * Ungeocoded points are dropped. Order is preserved.
 */
export function projectMilestones(
  items: readonly Geo[],
  bbox: BoundingBox,
  width: number,
  height: number,
): ProjectedPoint[] {
  const padded = padBoundingBox(bbox, BBOX_PADDING_FRACTION);
  const nw = latLngToPixel({ lat: padded.maxLat, lng: padded.minLng }, REFERENCE_ZOOM);
  const se = latLngToPixel({ lat: padded.minLat, lng: padded.maxLng }, REFERENCE_ZOOM);
  const projectedWidth = Math.max(se.x - nw.x, 1);
  const projectedHeight = Math.max(se.y - nw.y, 1);
  const scale = Math.min(width / projectedWidth, height / projectedHeight);
  const offsetX = (width - projectedWidth * scale) / 2;
  const offsetY = (height - projectedHeight * scale) / 2;

  const out: ProjectedPoint[] = [];
  for (const it of items) {
    if (it.lat == null || it.lng == null) continue;
    const p = latLngToPixel({ lat: it.lat, lng: it.lng }, REFERENCE_ZOOM);
    out.push({
      id: it.id,
      x: (p.x - nw.x) * scale + offsetX,
      y: (p.y - nw.y) * scale + offsetY,
    });
  }
  return out;
}
