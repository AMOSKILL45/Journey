import { supabase } from '@core/supabase/client';

export type LocationSharing = 'precise' | 'city_only' | 'paused' | 'never';
export const LOCATION_SHARING_MODES: LocationSharing[] = [
  'precise',
  'city_only',
  'paused',
  'never',
];

export interface MySharing {
  location_sharing: LocationSharing;
  panic_until: string | null;
}

async function selfId(): Promise<string> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authenticated');
  return user.id;
}

export async function getMySharing(tripId: string): Promise<MySharing | null> {
  const userId = await selfId();
  const { data, error } = await supabase
    .from('trip_members')
    .select('location_sharing, panic_until')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    location_sharing: (data.location_sharing as LocationSharing | null) ?? 'paused',
    panic_until: data.panic_until,
  };
}

export async function setSharing(tripId: string, mode: LocationSharing): Promise<void> {
  const userId = await selfId();
  const { error } = await supabase
    .from('trip_members')
    .update({ location_sharing: mode })
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setPanic(tripId: string, until: string | null): Promise<void> {
  const userId = await selfId();
  const { error } = await supabase
    .from('trip_members')
    .update({ panic_until: until })
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** True when presence/location should be broadcast: not 'never' and panic not active. */
export function sharingIsLive(sharing: MySharing | null | undefined): boolean {
  if (!sharing) return false;
  if (sharing.location_sharing === 'never') return false;
  if (sharing.panic_until && new Date(sharing.panic_until).getTime() > Date.now()) return false;
  return true;
}
