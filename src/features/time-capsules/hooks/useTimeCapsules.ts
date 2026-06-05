import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { supabase } from '@core/supabase/client';

import {
  createCapsule,
  listTripCapsules,
  openCapsule,
  type Capsule,
  type CreateCapsuleInput,
} from '../api';

export const capsulesKey = (tripId: string) => ['time-capsules', tripId] as const;

const INVALIDATE_DEBOUNCE_MS = 300;

/** All capsules (metadata) the caller may see in a trip, newest first by the RPC. */
export function useTimeCapsules(tripId: string) {
  return useQuery<Capsule[]>({
    queryKey: capsulesKey(tripId),
    queryFn: () => listTripCapsules(tripId),
    enabled: Boolean(tripId),
  });
}

/**
 * Live capsule activity for a trip: any change on `time_capsules` for this trip
 * (a new seal, or a checkin-driven unseal flipping `opened_at`/`is_open`)
 * invalidates the cached list. Dedicated channel — keeps the feature decoupled
 * from the realtime presence channel.
 */
export function useTimeCapsulesRealtime(tripId: string): void {
  const qc = useQueryClient();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tripId) return undefined;

    const invalidate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: capsulesKey(tripId) });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`time-capsules:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_capsules', filter: `trip_id=eq.${tripId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
    };
  }, [tripId, qc]);
}

/** Create + open mutations for a trip's capsules, invalidating the list on success. */
export function useCapsuleMutations(tripId: string) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: Omit<CreateCapsuleInput, 'tripId'>) => createCapsule({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capsulesKey(tripId) });
    },
  });

  const open = useMutation({
    mutationFn: (capsuleId: string) => openCapsule(capsuleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capsulesKey(tripId) });
    },
  });

  return { create, open };
}
