import type { Database } from '@core/supabase/types';

export type AchievementDefinition = Database['public']['Tables']['achievement_definitions']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementWithStatus extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: string | null;
}
