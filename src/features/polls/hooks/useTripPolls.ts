import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { supabase } from '@core/supabase/client';

import { listTripPollVotes, listTripPolls } from '../api';

export const pollsKey = (tripId: string) => ['polls', tripId] as const;
export const pollVotesKey = (tripId: string) => ['poll-votes', tripId] as const;

const INVALIDATE_DEBOUNCE_MS = 300;

export function usePolls(tripId: string) {
  return useQuery({
    queryKey: pollsKey(tripId),
    queryFn: () => listTripPolls(tripId),
    enabled: Boolean(tripId),
  });
}

export function usePollVotes(tripId: string) {
  return useQuery({
    queryKey: pollVotesKey(tripId),
    queryFn: () => listTripPollVotes(tripId),
    enabled: Boolean(tripId),
  });
}

/**
 * Subscribe to live poll activity for a trip: any change on `poll_votes` or
 * `polls` invalidates the cached lists so results/state update for everyone.
 * Uses a dedicated channel (not the realtime presence channel) to keep the
 * polls feature self-contained and free of cross-feature coupling.
 */
export function usePollsRealtime(tripId: string): void {
  const qc = useQueryClient();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tripId) return undefined;

    const invalidate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: pollsKey(tripId) });
        void qc.invalidateQueries({ queryKey: pollVotesKey(tripId) });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`polls:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, invalidate)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
    };
  }, [tripId, qc]);
}
