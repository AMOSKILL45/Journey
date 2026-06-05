import type { Database } from '@core/supabase/types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type MilestoneRow = Database['public']['Tables']['milestones']['Row'];
type MilestoneLegRow = Database['public']['Tables']['milestone_legs']['Row'];
type CheckinRow = Database['public']['Tables']['checkins']['Row'];

/** Milliseconds in one calendar day — used to convert a date span to whole days. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The subset of fields {@link computeTripStats} reads from a trip. */
export type StatsTrip = Pick<
  TripRow,
  'start_date' | 'end_date' | 'destination_country' | 'destination_countries'
>;

/** The subset of fields {@link computeTripStats} reads from a milestone. */
export type StatsMilestone = Pick<MilestoneRow, 'arrival_at' | 'departure_at'>;

/** The subset of fields {@link computeTripStats} reads from a leg. */
export type StatsLeg = Pick<MilestoneLegRow, 'distance_m'>;

/** Headline numbers rendered on the scrapbook card and embedded in the PDF cover. */
export interface TripStats {
  /** Total driving distance across all computed legs, in metres. */
  distanceM: number;
  /** Number of distinct destination countries (ISO codes), deduped. */
  countries: number;
  /** Whole-day span of the trip (inclusive), or 0 when no dates are known. */
  days: number;
  /** Number of check-ins recorded on the trip. */
  checkins: number;
}

/** Coerce a value that may be a Date | ISO string | null into epoch ms, or null. */
function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Inclusive whole-day span between the earliest and latest known dates. Prefers the
 * trip's own start/end; falls back to the milestone arrival/departure range so a
 * dateless trip with scheduled stops still reports a duration. Returns 0 when nothing
 * is dated.
 */
function computeDays(trip: StatsTrip, milestones: readonly StatsMilestone[]): number {
  const candidates: number[] = [];
  const pushTime = (v: string | null | undefined) => {
    const ms = toTime(v);
    if (ms !== null) candidates.push(ms);
  };

  pushTime(trip.start_date);
  pushTime(trip.end_date);
  for (const m of milestones) {
    pushTime(m.arrival_at);
    pushTime(m.departure_at);
  }

  if (candidates.length === 0) return 0;
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  // Inclusive: a same-day trip is 1 day.
  return Math.floor((max - min) / MS_PER_DAY) + 1;
}

/**
 * Distinct destination countries (ISO codes) for the trip. Merges the legacy single
 * `destination_country` with the multi-country `destination_countries` array, trims and
 * uppercases, and dedupes — mirroring the `countries_visited` metric used by the passport
 * (6B) and the achievements engine (6A).
 */
function computeCountries(trip: StatsTrip): number {
  const set = new Set<string>();
  const add = (raw: string | null | undefined) => {
    if (!raw) return;
    const code = raw.trim().toUpperCase();
    if (code) set.add(code);
  };
  add(trip.destination_country);
  for (const c of trip.destination_countries ?? []) add(c);
  return set.size;
}

/**
 * Compute the headline scrapbook stats from already-loaded trip data. Pure (no I/O):
 * the caller fetches trip + milestones + legs + checkins; this folds them into the four
 * numbers shown on the story card and persisted in `scrapbooks.stats`.
 *
 * - `distanceM` = sum of every leg's `distance_m`.
 * - `countries` = distinct destination ISO codes.
 * - `days` = inclusive day span of the trip (or its milestone dates as fallback).
 * - `checkins` = number of check-in rows.
 */
export function computeTripStats(
  trip: StatsTrip,
  milestones: readonly StatsMilestone[],
  legs: readonly StatsLeg[],
  checkins: readonly CheckinRow[],
): TripStats {
  const distanceM = legs.reduce((sum, leg) => sum + (leg.distance_m ?? 0), 0);
  return {
    distanceM,
    countries: computeCountries(trip),
    days: computeDays(trip, milestones),
    checkins: checkins.length,
  };
}
