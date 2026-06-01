import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { supabase } from '@core/supabase/client';
import { milestonesQueryKey, tripCheckinsQueryKey } from '@features/milestones';

import { usePresenceStore } from '../store/presenceStore';
import { presenceReduce, tripTopic, type PresenceMember } from '../utils/channel';

export type RealtimeStatus = 'connecting' | 'connected' | 'offline';

const INVALIDATE_DEBOUNCE_MS = 400;

/**
 * Subscribe to the trip's private Realtime channel: track self in presence,
 * mirror presence into the store, and invalidate milestone/check-in queries
 * on Postgres changes so the path/map update live.
 */
export function useTripChannel(
  tripId: string,
  self: PresenceMember | null,
  share: boolean,
): { status: RealtimeStatus } {
  const qc = useQueryClient();
  const setMembers = usePresenceStore((s) => s.setMembers);
  const clearTrip = usePresenceStore((s) => s.clearTrip);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tripId) return undefined;
    let cancelled = false;

    const channel = supabase.channel(tripTopic(tripId), {
      config: { private: true, presence: { key: self?.user_id ?? 'anon' } },
    });

    const invalidate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
        void qc.invalidateQueries({ queryKey: tripCheckinsQueryKey(tripId) });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as unknown as Record<string, PresenceMember[]>;
        setMembers(tripId, presenceReduce(state));
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones', filter: `trip_id=eq.${tripId}` },
        invalidate,
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, invalidate)
      .subscribe((s) => {
        if (cancelled) return;
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
          if (self && share) void channel.track(self);
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('offline');
        }
      });

    return () => {
      cancelled = true;
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
      clearTrip(tripId);
    };
  }, [tripId, self, share, qc, setMembers, clearTrip]);

  return { status };
}
