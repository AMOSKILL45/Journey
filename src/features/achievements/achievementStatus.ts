import type { AchievementDefinition, AchievementWithStatus, UserAchievement } from './types';

export function mergeStatus(
  defs: AchievementDefinition[],
  unlocks: UserAchievement[],
): AchievementWithStatus[] {
  const byId = new Map(unlocks.map((u) => [u.achievement_id, u]));
  return [...defs]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => ({
      ...d,
      unlocked: byId.has(d.id),
      unlockedAt: byId.get(d.id)?.unlocked_at ?? null,
    }));
}
export function unlockedCount(list: AchievementWithStatus[]): number {
  return list.filter((x) => x.unlocked).length;
}
