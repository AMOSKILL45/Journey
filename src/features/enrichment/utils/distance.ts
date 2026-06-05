// Pure distance + duration formatters for milestone legs. Locale-agnostic numeric output;
// the surrounding copy ("Driving", separators) is supplied by the caller via t().

export type DistanceUnit = 'metric' | 'imperial';

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MINUTES_PER_HOUR = 60;
const KM_SUFFIX = 'km';
const MI_SUFFIX = 'mi';
const HOUR_SUFFIX = 'h';
const MIN_SUFFIX = 'min';
const PAD_WIDTH = 2;

/**
 * Format a distance in meters to a short label.
 *   formatDistance(120_000, 'metric')   → '120 km'
 *   formatDistance(120_700, 'imperial') → '75 mi'
 * Rounds to the nearest whole unit (legs are coarse trip-scale distances).
 */
export function formatDistance(meters: number, unit: DistanceUnit = 'metric'): string {
  const safe = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (unit === 'imperial') {
    return `${Math.round(safe / METERS_PER_MILE)} ${MI_SUFFIX}`;
  }
  return `${Math.round(safe / METERS_PER_KM)} ${KM_SUFFIX}`;
}

/**
 * Format a duration in seconds.
 *   formatDuration(5400) → '1h30'   (hours present → zero-padded minutes)
 *   formatDuration(2700) → '45 min' (under an hour → minutes only)
 *   formatDuration(3600) → '1h00'
 * Rounds to the nearest minute.
 */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const totalMinutes = Math.round(safe / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours <= 0) {
    return `${minutes} ${MIN_SUFFIX}`;
  }
  return `${hours}${HOUR_SUFFIX}${String(minutes).padStart(PAD_WIDTH, '0')}`;
}

// Exported for tests / future locale work.
export const DISTANCE_CONSTANTS = {
  METERS_PER_KM,
  METERS_PER_MILE,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
} as const;
