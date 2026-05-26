/**
 * Web Mercator projection helpers — minimal subset for overworld + offline
 * pack computation. Earth-as-a-square model, tile size 256 by default,
 * latitude clamped at ±85.05° (Web Mercator standard) to avoid Infinity.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PixelXY {
  x: number;
  y: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const MAX_LAT = 85.05112878;
const DEFAULT_TILE_SIZE = 256;
const DEGENERATE_PAD = 0.05;

export function latLngToPixel(
  point: LatLng,
  zoom: number,
  tileSize: number = DEFAULT_TILE_SIZE,
): PixelXY {
  const lat = Math.max(Math.min(point.lat, MAX_LAT), -MAX_LAT);
  const scale = tileSize * Math.pow(2, zoom);
  const x = ((point.lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function pixelToLatLng(
  pixel: PixelXY,
  zoom: number,
  tileSize: number = DEFAULT_TILE_SIZE,
): LatLng {
  const scale = tileSize * Math.pow(2, zoom);
  const lng = (pixel.x / scale) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (pixel.y / scale);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export function computeBoundingBox(points: readonly LatLng[]): BoundingBox | null {
  if (points.length === 0) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function bboxCenter(bbox: BoundingBox): LatLng {
  return {
    lat: (bbox.minLat + bbox.maxLat) / 2,
    lng: (bbox.minLng + bbox.maxLng) / 2,
  };
}

export function padBoundingBox(bbox: BoundingBox, paddingFraction = 0.15): BoundingBox {
  const latExtent = bbox.maxLat - bbox.minLat;
  const lngExtent = bbox.maxLng - bbox.minLng;
  const latPad = latExtent === 0 ? DEGENERATE_PAD : latExtent * paddingFraction;
  const lngPad = lngExtent === 0 ? DEGENERATE_PAD : lngExtent * paddingFraction;
  return {
    minLat: bbox.minLat - latPad,
    maxLat: bbox.maxLat + latPad,
    minLng: bbox.minLng - lngPad,
    maxLng: bbox.maxLng + lngPad,
  };
}
