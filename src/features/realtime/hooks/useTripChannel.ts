import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@core/supabase/client';
import { milestonesQueryKey, tripCheckinsQueryKey } from '@features/milestones';

import { usePresenceStore } from '../store/presenceStore';
import { presenceReduce, tripTopic, type PresenceMember } from '../utils/channel';

export type RealtimeStatus = 'connecting' | 'connected' | 'offline';

export interface UseTripChannelResult {
  status: RealtimeStatus;
  sendPosition: (lat: number, lng: number) => void;
}

const INVALIDATE_DEBOUNCE_MS = 400;

/**
 * Subscribe to the trip's private Realtime channel: track self in presence,
 * mirror presence + live GPS positions into the store, and invalidate
 * milestone/check-in queries on Postgres changes so the path/map update live.
 */
export function useTripChannel(
  tripId: string,
  self: PresenceMember | null,
  share: boolean,
): UseTripChannelResult {
  const qc = useQueryClient();
  const setMembers = usePresenceStore((s) => s.setMembers);
  const setPosition = usePresenceStore((s) => s.setPosition);
  const clearTrip = usePresenceStore((s) => s.clearTrip);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!tripId) return undefined;
    let cancelled = false;

    const channel = supabase.channel(tripTopic(tripId), {
      config: { private: true, presence: { key: self?.user_id ?? 'anon' } },
    });
    channelRef.current = channel;

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
      .on('broadcast', { event: 'position' }, ({ payload }) => {
        const p = payload as { user_id?: string; lat?: number; lng?: number; ts?: number };
        if (p?.user_id && typeof p.lat === 'number' && typeof p.lng === 'number') {
          setPosition(p.user_id, { lat: p.lat, lng: p.lng, ts: p.ts ?? Date.now() });
        }
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
      channelRef.current = null;
      void supabase.removeChannel(channel);
      clearTrip(tripId);
    };
  }, [tripId, self, share, qc, setMembers, setPosition, clearTrip]);

  const sendPosition = useCallback(
    (lat: number, lng: number) => {
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'position',
        payload: { user_id: self?.user_id, lat, lng, ts: Date.now() },
      });
    },
    [self],
  );

  return { status, sendPosition };
}
