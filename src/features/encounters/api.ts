import { supabase } from '@core/supabase/client';
// Import from the milestones API module directly (not the feature barrel): the barrel
// re-exports components that pull in `expo-image`, which can't load in a non-component
// jest env. Same direct-path discipline used to break the trips↔checklists cycle.
import { createMilestone, type Milestone } from '@features/milestones/api/milestones';

import { encounterToMilestoneInput, type Encounter } from './utils/encounterMilestone';

export type { Encounter };

/** Name of the deployed edge function (verify_jwt=true; authorizes the caller as a trip member). */
export const RANDOM_ENCOUNTER_FN = 'random_encounter';

/** Shape the `random_encounter` edge function returns. */
export interface EncounterResponse {
  encounters: Encounter[];
}

export interface FetchEncountersInput {
  tripId: string;
  lat: number;
  lng: number;
  /** Search radius in metres; the edge fn applies a default + cap when omitted. */
  radius?: number;
}

/**
 * Ask the server to find nearby points of interest. The edge function fetches Overpass
 * with the service role (and caches the result); the client NEVER calls Overpass directly
 * nor reads `encounter_cache` (service-role only). Returns [] when nothing is nearby.
 */
export async function fetchEncounters(input: FetchEncountersInput): Promise<Encounter[]> {
  const { data, error } = await supabase.functions.invoke<EncounterResponse>(RANDOM_ENCOUNTER_FN, {
    body: {
      trip_id: input.tripId,
      lat: input.lat,
      lng: input.lng,
      radius: input.radius,
    },
  });
  if (error) throw error;
  return data?.encounters ?? [];
}

/**
 * Persist a chosen encounter as a trip milestone. Reuses the milestones create API so the
 * encounter lands on the path exactly like a hand-added stop. Never called automatically —
 * the user taps Add.
 */
export async function addEncounterAsMilestone(enc: Encounter, tripId: string): Promise<Milestone> {
  return createMilestone(encounterToMilestoneInput(enc, tripId));
}
