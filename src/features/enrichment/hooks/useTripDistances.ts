import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { getTripLegs, triggerEnrich, type MilestoneLegRow } from '../api';

export const tripLegsQueryKey = (tripId: string) => ['enrichment', 'legs', tripId] as const;

export interface UseTripDistancesOptions {
  /** Fire a server enrich (once) when no legs are cached yet. Default true. */
  autoEnrich?: boolean;
}

/** Build a lookup of legs keyed by `${fromId}->${toId}` for O(1) edge access. */
export function legKey(fromMilestoneId: string, toMilestoneId: string): string {
  return `${fromMilestoneId}->${toMilestoneId}`;
}

/**
 * Read cached driving legs for a trip. When none are cached and `autoEnrich` is on, trigger the
 * `enrich_milestone` edge fn once, then invalidate. Returns the rows plus a keyed map for edges.
 */
export function useTripDistances(tripId: string, options: UseTripDistancesOptions = {}) {
  const { autoEnrich = true } = options;
  const qc = useQueryClient();
  const enrichedRef = useRef(false);

  const query = useQuery<MilestoneLegRow[]>({
    queryKey: tripLegsQueryKey(tripId),
    queryFn: () => getTripLegs(tripId),
    enabled: Boolean(tripId),
  });

  const enrich = useMutation({
    mutationFn: (tid: string) => triggerEnrich(tid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tripLegsQueryKey(tripId) });
    },
  });

  const needsEnrich = query.isSuccess && (query.data?.length ?? 0) === 0;
  useEffect(() => {
    if (!autoEnrich || !tripId || enrichedRef.current || !needsEnrich) return;
    enrichedRef.current = true;
    enrich.mutate(tripId);
  }, [autoEnrich, tripId, needsEnrich, enrich]);

  const byKey = useMemo(() => {
    const map = new Map<string, MilestoneLegRow>();
    for (const leg of query.data ?? []) {
      map.set(legKey(leg.from_milestone_id, leg.to_milestone_id), leg);
    }
    return map;
  }, [query.data]);

  return { ...query, byKey, isEnriching: enrich.isPending };
}
