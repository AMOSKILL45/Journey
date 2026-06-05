import { supabase } from '@core/supabase/client';
import type { Milestone } from '@features/milestones';

import type { Trip } from './trips';

/**
 * Reads a trip by its public `share_token`. RLS returns the row only when the
 * trip's `visibility <> 'private'`, so a private trip (or an unknown token)
 * resolves to `null` — the caller renders the "not public" empty state.
 *
 * Read-only: this is the entry point for the unauthenticated-shareable public
 * trip view; it never exposes documents, checklists, photos or live locations
 * (those tables are not joined and stay behind their own RLS).
 */
export async function fetchPublicTripByToken(shareToken: string): Promise<Trip | null> {
  if (!shareToken) return null;
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', shareToken)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Reads the milestones for a public trip. The `milestones_public_select` RLS
 * policy (Phase 9A) gates this to trips whose `visibility <> 'private'`, so it
 * is safe to call for any trip id surfaced by {@link fetchPublicTripByToken}.
 */
export async function fetchPublicMilestones(tripId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
