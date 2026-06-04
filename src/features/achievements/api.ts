import { supabase } from '@core/supabase/client';

import type { AchievementDefinition, UserAchievement } from './types';

export async function fetchDefinitions(): Promise<AchievementDefinition[]> {
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const { data, error } = await supabase.from('user_achievements').select('*');
  if (error) throw error;
  return data ?? [];
}
export async function evaluateAchievements(): Promise<UserAchievement[]> {
  const { data, error } = await supabase.rpc('evaluate_achievements');
  if (error) throw error;
  return (data ?? []) as UserAchievement[];
}
