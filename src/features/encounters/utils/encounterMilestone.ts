import type { CreateMilestoneInput, MilestoneType } from '@features/milestones/api/milestones';

/**
 * A point of interest returned by the `random_encounter` edge function (which proxies
 * an OSM/Overpass query through the service role and caches it). Mirrors the
 * `Encounter` shape the edge fn emits — keep in sync with
 * `supabase/functions/random_encounter/providers/types.ts`.
 */
export interface Encounter {
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_m: number;
  tags: Record<string, string>;
}

/**
 * Maps a curated encounter category (lowercase) to the closest milestone type.
 * Anything not listed falls back to `'landmark'` (see `encounterToMilestoneInput`).
 * Categories come from the edge fn's Overpass query (tourism/amenity/historic/natural).
 */
export const CATEGORY_TO_MILESTONE_TYPE: Readonly<Record<string, MilestoneType>> = {
  viewpoint: 'landmark',
  artwork: 'landmark',
  attraction: 'activity',
  cafe: 'food',
  ice_cream: 'food',
  historic: 'landmark',
  peak: 'landmark',
  waterfall: 'landmark',
  beach: 'activity',
};

const DEFAULT_TYPE: MilestoneType = 'landmark';

/**
 * Build the milestone-creation input for "add this encounter to my trip". Never
 * mutates the trip itself — the caller decides when to persist (user taps Add).
 */
export function encounterToMilestoneInput(enc: Encounter, tripId: string): CreateMilestoneInput {
  const type = CATEGORY_TO_MILESTONE_TYPE[enc.category.toLowerCase()] ?? DEFAULT_TYPE;
  return {
    trip_id: tripId,
    type,
    name: enc.name,
    lat: enc.lat,
    lng: enc.lng,
  };
}
