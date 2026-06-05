/**
 * Caravan mode wire protocol (ADR-005). The caravan rides the Phase 5
 * members-only `trip:{id}` Realtime channel as a fire-and-forget `broadcast`
 * event — no database object, ephemeral by design. The leader emits its
 * camera (throttled); followers apply the latest frame and self-correct.
 */

/** Broadcast event name on the trip channel. Pinned by a contract test. */
export const CARAVAN_EVENT = 'caravan' as const;

export type MapMode = 'overworld' | 'real';

/** The shared viewport a leader publishes to its followers. */
export interface CaravanCamera {
  center: [number, number]; // [lng, lat]
  zoom: number;
  mapMode: MapMode;
}

export interface CaravanBroadcast extends CaravanCamera {
  leaderId: string;
}

export type CaravanRole = 'off' | 'leading' | 'following';

export interface CaravanState {
  role: CaravanRole;
  leaderId: string | null;
}

export const initialCaravan = (): CaravanState => ({ role: 'off', leaderId: null });

export type CaravanAction =
  | { type: 'lead'; selfId: string }
  | { type: 'follow'; leaderId: string }
  | { type: 'leave' }
  | { type: 'leaderGone'; leaderId: string };

/**
 * Pure role transition. `leaderGone` only resets us when we are following the
 * exact leader that left (presence-driven); it is a no-op otherwise.
 */
export function caravanReducer(s: CaravanState, a: CaravanAction): CaravanState {
  switch (a.type) {
    case 'lead':
      return { role: 'leading', leaderId: a.selfId };
    case 'follow':
      return { role: 'following', leaderId: a.leaderId };
    case 'leave':
      return initialCaravan();
    case 'leaderGone':
      return s.role === 'following' && s.leaderId === a.leaderId ? initialCaravan() : s;
  }
}

/**
 * Leading + trailing throttle. The first call in a window fires immediately;
 * subsequent calls within the window are coalesced into a single trailing call
 * with the latest args when the window closes. If nothing was queued during the
 * window, no trailing call fires.
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const flush = () => {
    if (pending !== null) {
      const args = pending;
      pending = null;
      fn(...args);
      timer = setTimeout(flush, ms); // keep the window open for the trailing burst
    } else {
      timer = null;
    }
  };

  return (...args: A) => {
    if (timer === null) {
      fn(...args); // leading edge
      timer = setTimeout(flush, ms);
    } else {
      pending = args; // coalesce — latest args win
    }
  };
}
