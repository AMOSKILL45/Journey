import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type Trip = Database['public']['Tables']['trips']['Row'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];

export async function listMyTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTrip(input: Omit<TripInsert, 'owner_id'>): Promise<Trip> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...input, owner_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrip(id: string, updates: TripUpdate): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}
