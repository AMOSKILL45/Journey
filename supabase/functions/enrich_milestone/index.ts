// enrich_milestone: client-triggered milestone enrichment proxy (ADR-001/002).
// Deployed with verify_jwt=true; authorizes the caller as a trip member (trip_members) before
// any service-role work. Input { trip_id }. For each milestone with lat/lng: fetch Open-Meteo current weather and upsert
// weather_cache (expires_at = now()+6h). For each consecutive ordered milestone pair: fetch the
// OSRM driving route and upsert milestone_legs; prune legs whose endpoints are no longer adjacent.
// Service role bypasses RLS; the cache tables are intentionally NOT client-writable.
// Returns { weather: n, legs: m }.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const WEATHER_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const DRIVING_MODE = 'driving';

interface MilestoneRow {
  id: string;
  trip_id: string;
  lat: number | null;
  lng: number | null;
  order_index: number;
}

interface OpenMeteoCurrent {
  current?: { temperature_2m?: number; weather_code?: number; time?: string };
}

interface OsrmRoute {
  routes?: Array<{ distance?: number; duration?: number }>;
}

async function fetchWeather(
  lat: number,
  lng: number,
): Promise<{
  weatherCode: number;
  temperatureC: number;
  observedAt: string;
} | null> {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}` + `&current=temperature_2m,weather_code`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as OpenMeteoCurrent;
    const cur = body.current;
    if (!cur || typeof cur.temperature_2m !== 'number' || typeof cur.weather_code !== 'number') {
      return null;
    }
    return {
      weatherCode: cur.weather_code,
      temperatureC: cur.temperature_2m,
      observedAt: cur.time ?? new Date().toISOString(),
    };
  } catch (_e) {
    return null;
  }
}

async function fetchLeg(
  from: MilestoneRow,
  to: MilestoneRow,
): Promise<{ distance_m: number; duration_s: number } | null> {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as OsrmRoute;
    const route = body.routes?.[0];
    if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      return null;
    }
    return { distance_m: Math.round(route.distance), duration_s: Math.round(route.duration) };
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Auth (deployed with verify_jwt=true): identify the caller from their forwarded JWT, then
  // authorize them as a member of the target trip before any privileged (service-role) work.
  // The cache tables stay server-written and are never client-writable.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await sb.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (!userId) return new Response('unauthorized', { status: 401 });

  let tripId: string | null = null;
  try {
    const body = (await req.json()) as { trip_id?: string };
    tripId = body.trip_id ?? null;
  } catch (_e) {
    tripId = null;
  }
  if (!tripId) {
    return new Response(JSON.stringify({ error: 'trip_id required' }), {
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

  const { data: milestones } = await sb
    .from('milestones')
    .select('id, trip_id, lat, lng, order_index')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });

  const ordered = (milestones ?? []) as MilestoneRow[];
  const geo = ordered.filter((m) => m.lat != null && m.lng != null);

  // --- Weather: one upsert per geolocated milestone ---
  let weather = 0;
  const nowMs = Date.now();
  for (const m of geo) {
    const w = await fetchWeather(m.lat as number, m.lng as number);
    if (!w) continue;
    const { error } = await sb.from('weather_cache').upsert(
      {
        milestone_id: m.id,
        payload: w,
        fetched_at: new Date(nowMs).toISOString(),
        expires_at: new Date(nowMs + WEATHER_TTL_MS).toISOString(),
      },
      { onConflict: 'milestone_id' },
    );
    if (!error) weather++;
  }

  // --- Legs: consecutive ordered geolocated pairs ---
  let legs = 0;
  const keptKeys = new Set<string>();
  for (let i = 0; i < geo.length - 1; i++) {
    const from = geo[i];
    const to = geo[i + 1];
    const leg = await fetchLeg(from, to);
    if (!leg) continue;
    const { error } = await sb.from('milestone_legs').upsert(
      {
        trip_id: tripId,
        from_milestone_id: from.id,
        to_milestone_id: to.id,
        distance_m: leg.distance_m,
        duration_s: leg.duration_s,
        mode: DRIVING_MODE,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'from_milestone_id,to_milestone_id' },
    );
    if (!error) {
      legs++;
      keptKeys.add(`${from.id}:${to.id}`);
    }
  }

  // --- Prune legs whose endpoints are no longer adjacent (reorder/insert/delete) ---
  const { data: existing } = await sb
    .from('milestone_legs')
    .select('from_milestone_id, to_milestone_id')
    .eq('trip_id', tripId);
  for (const row of existing ?? []) {
    const key = `${row.from_milestone_id}:${row.to_milestone_id}`;
    if (keptKeys.has(key)) continue;
    await sb
      .from('milestone_legs')
      .delete()
      .eq('from_milestone_id', row.from_milestone_id)
      .eq('to_milestone_id', row.to_milestone_id);
  }

  return new Response(JSON.stringify({ weather, legs }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
