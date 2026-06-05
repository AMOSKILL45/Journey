import { useMutation, useQueryClient } from '@tanstack/react-query';

// Direct hook-module path (not the feature barrel) to stay clear of the barrel's
// component re-exports (expo-image) in the jest env.
import { milestonesQueryKey } from '@features/milestones/hooks/useMilestones';

import {
  addEncounterAsMilestone,
  fetchEncounters,
  type Encounter,
  type FetchEncountersInput,
} from '../api';

/**
 * Random-encounter actions for a trip. There is no background query — encounters are
 * "surprise me", so fetching is an explicit mutation the user triggers. `find` exposes
 * loading/error for the skeleton + retry affordances; `add` persists a chosen encounter
 * as a milestone and invalidates the trip's milestone list.
 */
export function useEncounters(tripId: string) {
  const qc = useQueryClient();

  const find = useMutation<Encounter[], Error, Omit<FetchEncountersInput, 'tripId'>>({
    mutationFn: (args) => fetchEncounters({ ...args, tripId }),
  });

  const add = useMutation({
    mutationFn: (enc: Encounter) => addEncounterAsMilestone(enc, tripId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
    },
  });

  return { find, add };
}
