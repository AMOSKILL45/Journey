// OverpassProvider: free OpenStreetMap POIs via the Overpass API (no key, no cost).
import type { Encounter, EncounterProvider } from './types.ts';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

function categoryOf(tags: Record<string, string>): string {
  return tags.tourism ?? tags.historic ?? tags.natural ?? tags.amenity ?? 'place';
}

export class OverpassProvider implements EncounterProvider {
  async findNearby(lat: number, lng: number, radiusM: number): Promise<Encounter[]> {
    const r = Math.round(radiusM);
    const query =
      `[out:json][timeout:25];(` +
      `node["tourism"~"viewpoint|artwork|attraction"](around:${r},${lat},${lng});` +
      `node["amenity"~"cafe|ice_cream"](around:${r},${lat},${lng});` +
      `node["historic"](around:${r},${lat},${lng});` +
      `node["natural"~"peak|waterfall|beach"](around:${r},${lat},${lng});` +
      `);out body 30;`;

    let res: Response;
    try {
      res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
    } catch (_e) {
      return [];
    }
    if (!res.ok) return [];

    const body = (await res.json()) as { elements?: OverpassElement[] };
    const out: Encounter[] = [];
    for (const el of body.elements ?? []) {
      if (el.lat == null || el.lon == null) continue;
      const tags = el.tags ?? {};
      const name = tags.name;
      if (!name) continue; // only named POIs make a good "encounter"
      out.push({
        name,
        category: categoryOf(tags),
        lat: el.lat,
        lng: el.lon,
        distance_m: haversineMeters(lat, lng, el.lat, el.lon),
        tags,
      });
    }
    out.sort((a, b) => a.distance_m - b.distance_m);
    return out.slice(0, 30);
  }
}
