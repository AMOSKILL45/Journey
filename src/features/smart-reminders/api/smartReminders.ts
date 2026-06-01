import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type SmartReminder = Database['public']['Tables']['trip_smart_reminders']['Row'];

export async function listTripSmartReminders(tripId: string): Promise<SmartReminder[]> {
  const { data, error } = await supabase
    .from('trip_smart_reminders')
    .select('*')
    .eq('trip_id', tripId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setReminderStatus(
  id: string,
  status: SmartReminder['status'],
  extra: Partial<Pick<SmartReminder, 'snooze_until' | 'marked_done_at'>> = {},
): Promise<void> {
  const { error } = await supabase
    .from('trip_smart_reminders')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);
  if (error) throw error;
}

export async function snooze7d(id: string): Promise<void> {
  const until = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await setReminderStatus(id, 'snoozed', { snooze_until: until });
}
