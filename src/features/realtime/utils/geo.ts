export interface Pt {
  lat: number;
  lng: number;
}
export interface Stamped extends Pt {
  ts: number;
}

/** Round to ~0.1° (≈11 km) for the city_only privacy mode. */
export function cityRound(deg: number): number {
  return Math.round(deg * 10) / 10;
}

const EARTH_R = 6_371_000;
export function haversineMeters(a: Pt, b: Pt): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

const MIN_MS = 5_000;
const MIN_M = 50;
/** Throttle: broadcast on first fix, or after 5s, or after 50m of movement. */
export function shouldBroadcast(last: Stamped | null, next: Pt, now: number): boolean {
  if (!last) return true;
  if (now - last.ts >= MIN_MS) return true;
  return haversineMeters(last, next) >= MIN_M;
}
