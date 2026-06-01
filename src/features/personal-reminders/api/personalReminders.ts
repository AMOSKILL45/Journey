import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

import { DEFAULT_LEAD_TIMES, documentCategoryToReminderType } from '../utils/reminderTypes';

export type PersonalReminder = Database['public']['Tables']['personal_reminders']['Row'];

export async function listPersonalReminders(): Promise<PersonalReminder[]> {
  const { data, error } = await supabase
    .from('personal_reminders')
    .select('*')
    .neq('status', 'dismissed')
    .order('target_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createManualReminder(input: {
  title: string;
  targetDate: string; // 'YYYY-MM-DD'
  leadTimes?: number[];
}): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authenticated');
  const { error } = await supabase.from('personal_reminders').insert({
    user_id: user.id,
    reminder_type: 'custom',
    title: input.title,
    target_date: input.targetDate,
    lead_times: input.leadTimes ?? DEFAULT_LEAD_TIMES.custom,
    source: 'manual',
  });
  if (error) throw error;
}

export async function createReminderFromDocument(input: {
  documentId: string;
  category: string;
  expiresAt: string;
}): Promise<void> {
  const type = documentCategoryToReminderType(input.category);
  if (!type) return; // not a reminder-eligible category
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authenticated');
  const { error } = await supabase.from('personal_reminders').insert({
    user_id: user.id,
    reminder_type: type,
    related_document_id: input.documentId,
    target_date: input.expiresAt,
    i18n_key: `lifeReminders.types.${type}`,
    lead_times: DEFAULT_LEAD_TIMES[type],
    source: 'manual', // user-initiated from the doc sheet; RLS allows manual INSERT
  });
  if (error) throw error;
}

export async function updateReminder(
  id: string,
  patch: Partial<
    Pick<PersonalReminder, 'title' | 'target_date' | 'lead_times' | 'status' | 'snooze_until'>
  >,
): Promise<void> {
  const { error } = await supabase
    .from('personal_reminders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('personal_reminders').delete().eq('id', id);
  if (error) throw error;
}
