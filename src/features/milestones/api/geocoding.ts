import { env } from '@core/env';

export interface GeocodingResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

interface MapTilerFeature {
  id?: string;
  type: 'Feature';
  place_name?: string;
  place_name_en?: string;
  text?: string;
  text_en?: string;
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
  properties?: { country_code?: string } & Record<string, unknown>;
}

interface MapTilerResponse {
  type: 'FeatureCollection';
  features?: MapTilerFeature[];
}

const MAPTILER_BASE = 'https://api.maptiler.com/geocoding';
const DEFAULT_LIMIT = 5;

export class GeocodingNotConfiguredError extends Error {
  constructor() {
    super('MapTiler API key is not configured (EXPO_PUBLIC_MAPTILER_API_KEY).');
    this.name = 'GeocodingNotConfiguredError';
  }
}

export async function searchPlaces(
  query: string,
  options: { signal?: AbortSignal; limit?: number; language?: string } = {},
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = env.maptilerApiKey;
  if (!apiKey) {
    throw new GeocodingNotConfiguredError();
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const language = options.language ?? 'en';
  const url = `${MAPTILER_BASE}/${encodeURIComponent(trimmed)}.json?key=${encodeURIComponent(
    apiKey,
  )}&limit=${limit}&language=${language}`;

  const res = await fetch(url, { signal: options.signal });
  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }

  const json = (await res.json()) as MapTilerResponse;
  const features = json.features ?? [];
  return features.map(featureToResult).filter((r): r is GeocodingResult => r !== null);
}

function featureToResult(feature: MapTilerFeature): GeocodingResult | null {
  const coords = feature.center ?? feature.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;

  const name = feature.text_en ?? feature.text ?? feature.place_name ?? '';
  const address = feature.place_name_en ?? feature.place_name ?? name;
  if (!name) return null;

  return {
    id: feature.id ?? `${lat},${lng}`,
    name,
    address,
    lat,
    lng,
    countryCode: feature.properties?.country_code,
  };
}
