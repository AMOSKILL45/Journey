import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
export type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

export type MilestoneType =
  | 'city'
  | 'hotel'
  | 'activity'
  | 'transport'
  | 'food'
  | 'landmark'
  | 'custom';

export interface CreateMilestoneInput {
  trip_id: string;
  type: MilestoneType;
  name: string;
  description?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  arrival_at?: string | null;
  departure_at?: string | null;
  is_boss?: boolean;
  sprite_id?: string | null;
  custom_type_label?: string | null;
}

export async function listMilestones(tripId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMilestone(id: string): Promise<Milestone | null> {
  const { data, error } = await supabase.from('milestones').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function nextOrderIndex(tripId: string): Promise<number> {
  const { data, error } = await supabase
    .from('milestones')
    .select('order_index')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const last = data ? Number(data.order_index ?? 0) : 0;
  return last + 1;
}

export async function createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const order = await nextOrderIndex(input.trip_id);
  const location =
    input.lat != null && input.lng != null ? `SRID=4326;POINT(${input.lng} ${input.lat})` : null;

  const insert: MilestoneInsert = {
    trip_id: input.trip_id,
    type: input.type,
    name: input.name,
    description: input.description ?? null,
    address: input.address ?? null,
    location: location as unknown as MilestoneInsert['location'],
    arrival_at: input.arrival_at ?? null,
    departure_at: input.departure_at ?? null,
    is_boss: input.is_boss ?? false,
    sprite_id: input.sprite_id ?? null,
    custom_type_label: input.custom_type_label ?? null,
    order_index: order,
    created_by: userData.user.id,
  };

  const { data, error } = await supabase.from('milestones').insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function updateMilestone(id: string, updates: MilestoneUpdate): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}

// CHECKINS
export type Checkin = Database['public']['Tables']['checkins']['Row'];

export async function listCheckins(milestoneId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('milestone_id', milestoneId);
  if (error) throw error;
  return data ?? [];
}

export async function createCheckin(milestoneId: string, note?: string): Promise<Checkin> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('checkins')
    .insert({ milestone_id: milestoneId, user_id: userData.user.id, note: note ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCheckin(milestoneId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('milestone_id', milestoneId)
    .eq('user_id', userData.user.id);
  if (error) throw error;
}
