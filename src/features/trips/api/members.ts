import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type TripMember = Database['public']['Tables']['trip_members']['Row'];
export type TripInvitation = Database['public']['Tables']['trip_invitations']['Row'];

export interface TripMemberWithProfile extends TripMember {
  profile: {
    display_name: string | null;
    avatar_sprite_id: string | null;
    avatar_color: string | null;
  } | null;
}

export async function listMembers(tripId: string): Promise<TripMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, profile:profiles(display_name, avatar_sprite_id, avatar_color)')
    .eq('trip_id', tripId);
  if (error) throw error;
  return (data ?? []) as unknown as TripMemberWithProfile[];
}

export async function listInvitations(tripId: string): Promise<TripInvitation[]> {
  const { data, error } = await supabase
    .from('trip_invitations')
    .select('*')
    .eq('trip_id', tripId)
    .is('accepted_at', null);
  if (error) throw error;
  return data ?? [];
}

export async function createInvitation(
  tripId: string,
  email: string | null,
): Promise<TripInvitation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('trip_invitations')
    .insert({ trip_id: tripId, email, invited_by: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function acceptInvitation(token: string): Promise<{ trip_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ trip_id: string }>(
    'accept-invitation',
    { body: { token } },
  );
  if (error) throw error;
  if (!data) throw new Error('No data returned from accept-invitation');
  return data;
}

export function buildInvitationLink(token: string): string {
  // Deep link URL for sharing; opens the native app when installed.
  return `https://thisisthejourney.app/invite/${token}`;
}

export function buildInvitationScheme(token: string): string {
  // App scheme URL (alternative if user has the app installed but the universal link isn't configured).
  return `thisisthejourney://invite/${token}`;
}
