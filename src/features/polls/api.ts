import { supabase } from '@core/supabase/client';
import type { Database, Json } from '@core/supabase/types';

import type { PollOption } from './utils/pollResults';

export type Poll = Database['public']['Tables']['polls']['Row'];
export type PollVote = Database['public']['Tables']['poll_votes']['Row'];

export interface CreatePollInput {
  tripId: string;
  question: string;
  options: PollOption[];
  milestoneId?: string | null;
  expiresAt?: string | null;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/** All polls for a trip, newest first. */
export async function listTripPolls(tripId: string): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** All votes across the trip's polls (joined via the poll FK). */
export async function listTripPollVotes(tripId: string): Promise<PollVote[]> {
  const polls = await listTripPolls(tripId);
  const ids = polls.map((p) => p.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('poll_votes').select('*').in('poll_id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('polls')
    .insert({
      trip_id: input.tripId,
      question: input.question,
      // PollOption[] is valid JSON at runtime; cast to the jsonb column type.
      options: input.options as unknown as Json,
      milestone_id: input.milestoneId ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: uid,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Cast or change the caller's vote. The PK `(poll_id, user_id)` makes this an
 * upsert: re-voting overwrites the previous option (single-select, change-allowed).
 */
export async function castVote(pollId: string, optionId: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('poll_votes')
    .upsert(
      { poll_id: pollId, user_id: uid, option_id: optionId, voted_at: new Date().toISOString() },
      { onConflict: 'poll_id,user_id' },
    );
  if (error) throw error;
}

/** Close a poll immediately (creator/editor only — enforced by RLS). */
export async function closePoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from('polls')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', pollId);
  if (error) throw error;
}
