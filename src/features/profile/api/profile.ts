import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(updates: ProfileUpdate): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userData.user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
