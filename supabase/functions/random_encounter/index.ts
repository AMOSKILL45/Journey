// random_encounter: client-triggered surprise-POI proxy (ADR-006).
// Deployed verify_jwt=true; identifies the caller from their forwarded JWT and authorizes them as a
// trip member before any service-role work. Input { trip_id, lat, lng, radius? }. Queries the
// Overpass provider (free OSM POIs), caches in encounter_cache (coord-rounded key, 24h TTL; the
// cache is NOT client-writable). Returns { encounters, cached }.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OverpassProvider } from './providers/overpass.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_RADIUS_M = 1500;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 5000;

function cacheKey(lat: number, lng: number, radiusM: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(radiusM)}`;
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await sb.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (!userId) return new Response('unauthorized', { status: 401 });

  let tripId: string | null = null;
  let lat = NaN;
  let lng = NaN;
  let radius = DEFAULT_RADIUS_M;
  try {
    const body = (await req.json()) as {
      trip_id?: string;
      lat?: number;
      lng?: number;
      radius?: number;
    };
    tripId = body.trip_id ?? null;
    lat = Number(body.lat);
    lng = Number(body.lng);
    if (body.radius != null) {
      radius = Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Number(body.radius)));
    }
  } catch (_e) {
    tripId = null;
  }
  if (!tripId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response(JSON.stringify({ error: 'trip_id, lat, lng required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: membership } = await sb
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!membership) return new Response('forbidden', { status: 403 });

  const key = cacheKey(lat, lng, radius);
  const nowMs = Date.now();
  const { data: cached } = await sb
    .from('encounter_cache')
    .select('results, expires_at')
    .eq('cache_key', key)
    .maybeSingle();
  if (cached && new Date(cached.expires_at).getTime() > nowMs) {
    return new Response(JSON.stringify({ encounters: cached.results, cached: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const provider = new OverpassProvider();
  const encounters = await provider.findNearby(lat, lng, radius);
  await sb.from('encounter_cache').upsert(
    {
      cache_key: key,
      results: encounters,
      fetched_at: new Date(nowMs).toISOString(),
      expires_at: new Date(nowMs + CACHE_TTL_MS).toISOString(),
    },
    { onConflict: 'cache_key' },
  );

  return new Response(JSON.stringify({ encounters, cached: false }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
