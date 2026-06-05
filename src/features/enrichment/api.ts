import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type WeatherCacheRow = Database['public']['Tables']['weather_cache']['Row'];
export type MilestoneLegRow = Database['public']['Tables']['milestone_legs']['Row'];

// Shape the `enrich_milestone` edge fn writes into weather_cache.payload (from Open-Meteo
// `current`). Read-only on the client; the cache is never client-writable (service role only).
export interface WeatherPayload {
  weatherCode: number;
  temperatureC: number;
  observedAt: string;
}

export interface MilestoneWeather {
  milestoneId: string;
  payload: WeatherPayload;
  fetchedAt: string;
  expiresAt: string;
  isStale: boolean;
}

function parseWeatherPayload(raw: WeatherCacheRow['payload']): WeatherPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const weatherCode = obj.weatherCode;
  const temperatureC = obj.temperatureC;
  const observedAt = obj.observedAt;
  if (typeof weatherCode !== 'number' || typeof temperatureC !== 'number') return null;
  return {
    weatherCode,
    temperatureC,
    observedAt: typeof observedAt === 'string' ? observedAt : '',
  };
}

/**
 * Ask the server to (re)compute weather + driving legs for a trip. The edge function fetches
 * Open-Meteo + OSRM with the service role and upserts the cache tables. The client NEVER calls
 * those external APIs nor writes the cache tables directly (ADR-001/002).
 */
export async function triggerEnrich(tripId: string): Promise<{ weather: number; legs: number }> {
  const { data, error } = await supabase.functions.invoke<{ weather: number; legs: number }>(
    'enrich_milestone',
    { body: { trip_id: tripId } },
  );
  if (error) throw error;
  return { weather: data?.weather ?? 0, legs: data?.legs ?? 0 };
}

/** Read the cached weather for one milestone (member-readable). Returns null when uncached. */
export async function getMilestoneWeather(milestoneId: string): Promise<MilestoneWeather | null> {
  const { data, error } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('milestone_id', milestoneId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const payload = parseWeatherPayload(data.payload);
  if (!payload) return null;
  return {
    milestoneId: data.milestone_id,
    payload,
    fetchedAt: data.fetched_at,
    expiresAt: data.expires_at,
    isStale: new Date(data.expires_at).getTime() <= Date.now(),
  };
}

/** Read all cached driving legs for a trip (member-readable). */
export async function getTripLegs(tripId: string): Promise<MilestoneLegRow[]> {
  const { data, error } = await supabase.from('milestone_legs').select('*').eq('trip_id', tripId);
  if (error) throw error;
  return data ?? [];
}
