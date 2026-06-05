import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getMilestoneWeather, triggerEnrich, type MilestoneWeather } from '../api';

export const milestoneWeatherQueryKey = (milestoneId: string) =>
  ['enrichment', 'weather', milestoneId] as const;

export interface UseMilestoneWeatherOptions {
  /** When true, fire a server enrich (once) if the cache is missing or expired. Default true. */
  autoEnrich?: boolean;
  /** Trip id required to trigger an enrich (the edge fn works per trip). */
  tripId?: string;
}

/**
 * Read cached weather for a milestone. When the cache is missing or stale and `autoEnrich`
 * is on, trigger the `enrich_milestone` edge fn exactly once, then invalidate the query.
 */
export function useMilestoneWeather(milestoneId: string, options: UseMilestoneWeatherOptions = {}) {
  const { autoEnrich = true, tripId } = options;
  const qc = useQueryClient();
  const enrichedRef = useRef(false);

  const query = useQuery<MilestoneWeather | null>({
    queryKey: milestoneWeatherQueryKey(milestoneId),
    queryFn: () => getMilestoneWeather(milestoneId),
    enabled: Boolean(milestoneId),
  });

  const enrich = useMutation({
    mutationFn: (tid: string) => triggerEnrich(tid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: milestoneWeatherQueryKey(milestoneId) });
    },
  });

  const needsEnrich = query.isSuccess && (query.data === null || query.data.isStale === true);
  useEffect(() => {
    if (!autoEnrich || !tripId || enrichedRef.current || !needsEnrich) return;
    enrichedRef.current = true;
    enrich.mutate(tripId);
  }, [autoEnrich, tripId, needsEnrich, enrich]);

  return { ...query, isEnriching: enrich.isPending };
}
