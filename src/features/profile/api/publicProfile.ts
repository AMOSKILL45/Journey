import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

/**
 * The safe public subset of a profile, served by the grant-hardened
 * `get_public_profile` SECURITY DEFINER RPC. The base `profiles` table is
 * own-only (Phase 9C PII hardening) — this is the ONLY cross-user read path,
 * and it returns a row only when the target opted `visibility = 'public'`.
 * `gender` / `age_range` are present only when the user opted into sharing them.
 */
export type PublicProfile =
  Database['public']['Functions']['get_public_profile']['Returns'][number];

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_user_id: userId });
  if (error) throw error;
  return data?.[0] ?? null;
}
