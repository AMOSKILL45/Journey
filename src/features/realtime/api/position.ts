import { supabase } from '@core/supabase/client';

/** 60s GPS backup so an offline member still shows a last-known dot. */
export async function writeLastPosition(tripId: string, lat: number, lng: number): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await supabase
    .from('trip_members')
    .update({ last_lat: lat, last_lng: lng, last_position_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('user_id', user.id);
}
