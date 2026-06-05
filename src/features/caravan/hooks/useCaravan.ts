import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCaravanStore } from '../store/caravanStore';
import {
  CARAVAN_EVENT,
  throttle,
  type CaravanBroadcast,
  type CaravanCamera,
  type CaravanRole,
} from '../utils/caravanProtocol';

/** Camera broadcasts no more than ~4×/s — bounds bandwidth at pan frequency. */
const BROADCAST_THROTTLE_MS = 250;

export interface UseCaravanResult {
  role: CaravanRole;
  leaderId: string | null;
  /** Latest camera frame from the leader we follow, or null when not following. */
  incomingCamera: CaravanCamera | null;
  lead: () => void;
  follow: (leaderId: string) => void;
  leave: () => void;
  /** Throttled — only emits while leading; a no-op otherwise. */
  broadcastCamera: (camera: CaravanCamera) => void;
}

/**
 * Drives caravan mode over a members-only trip Realtime channel (ADR-005).
 *
 * - `lead()` makes us the leader; `broadcastCamera` then emits our viewport
 *   (throttled) as a `caravan` broadcast to every channel subscriber.
 * - `follow(leaderId)` makes us a follower; incoming broadcasts from that exact
 *   leader are surfaced as `incomingCamera` for the map to apply.
 * - `leave()` drops back to `off`.
 *
 * The channel is passed in (decoupled) so the map owns the channel lifecycle.
 * Camera sync is fire-and-forget: a dropped frame self-corrects on the next.
 */
export function useCaravan(
  channel: RealtimeChannel | null,
  selfId: string | null,
): UseCaravanResult {
  const role = useCaravanStore((s) => s.role);
  const leaderId = useCaravanStore((s) => s.leaderId);
  const dispatch = useCaravanStore((s) => s.dispatch);
  const [incomingCamera, setIncomingCamera] = useState<CaravanCamera | null>(null);

  // Keep the receive handler reading the freshest role/leader without resubscribing.
  const roleRef = useRef<CaravanRole>(role);
  const leaderRef = useRef<string | null>(leaderId);
  roleRef.current = role;
  leaderRef.current = leaderId;

  useEffect(() => {
    if (!channel) return undefined;
    channel.on('broadcast', { event: CARAVAN_EVENT }, ({ payload }) => {
      const b = payload as Partial<CaravanBroadcast>;
      if (
        roleRef.current === 'following' &&
        b.leaderId != null &&
        b.leaderId === leaderRef.current &&
        Array.isArray(b.center) &&
        typeof b.zoom === 'number' &&
        (b.mapMode === 'overworld' || b.mapMode === 'real')
      ) {
        setIncomingCamera({ center: b.center, zoom: b.zoom, mapMode: b.mapMode });
      }
    });
    return undefined;
  }, [channel]);

  // A single stable throttled sender bound to the current channel + self id.
  const send = useMemo(
    () =>
      throttle((camera: CaravanCamera) => {
        if (!channel || !selfId) return;
        const payload: CaravanBroadcast = { ...camera, leaderId: selfId };
        void channel.send({ type: 'broadcast', event: CARAVAN_EVENT, payload });
      }, BROADCAST_THROTTLE_MS),
    [channel, selfId],
  );

  const lead = useCallback(() => {
    if (!selfId) return;
    dispatch({ type: 'lead', selfId });
    setIncomingCamera(null);
  }, [dispatch, selfId]);

  const follow = useCallback(
    (id: string) => {
      dispatch({ type: 'follow', leaderId: id });
    },
    [dispatch],
  );

  const leave = useCallback(() => {
    dispatch({ type: 'leave' });
    setIncomingCamera(null);
  }, [dispatch]);

  const broadcastCamera = useCallback(
    (camera: CaravanCamera) => {
      if (roleRef.current !== 'leading') return;
      send(camera);
    },
    [send],
  );

  return { role, leaderId, incomingCamera, lead, follow, leave, broadcastCamera };
}
