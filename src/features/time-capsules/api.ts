import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

/** A row from the metadata `list_trip_capsules` RPC. `message` is non-null only
 *  when the capsule is open AND the caller is its recipient (or it's a group
 *  capsule) — enforced server-side; sealed rows arrive with `message: null`. */
export type Capsule = Database['public']['Functions']['list_trip_capsules']['Returns'][number];

/** The underlying table row (used for the insert shape). */
export type TimeCapsuleRow = Database['public']['Tables']['time_capsules']['Row'];

export interface CreateCapsuleInput {
  tripId: string;
  message: string;
  /** ISO timestamp for a date-anchored capsule (mutually exclusive with milestone). */
  openAfter?: string | null;
  /** Milestone whose first check-in unseals the capsule. */
  openAtMilestone?: string | null;
  /** `null` → a group capsule visible to every member; else a single recipient. */
  recipientId?: string | null;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/**
 * Metadata for every capsule the caller may see in a trip (their own + group +
 * ones addressed to them). Sealed capsules come back without their message.
 */
export async function listTripCapsules(tripId: string): Promise<Capsule[]> {
  const { data, error } = await supabase.rpc('list_trip_capsules', { p_trip_id: tripId });
  if (error) throw error;
  return data ?? [];
}

/** Seal a new capsule. RLS requires the author to be a trip member. */
export async function createCapsule(input: CreateCapsuleInput): Promise<TimeCapsuleRow> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('time_capsules')
    .insert({
      trip_id: input.tripId,
      author_id: uid,
      message: input.message,
      open_after: input.openAfter ?? null,
      open_at_milestone: input.openAtMilestone ?? null,
      recipient_id: input.recipientId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Open a capsule: the server re-checks every gate (membership, recipient,
 * openness), stamps `opened_at` once, and returns the decrypted message text.
 */
export async function openCapsule(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('open_time_capsule', { p_capsule_id: id });
  if (error) throw error;
  return data ?? '';
}
