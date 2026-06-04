import { useQuery } from '@tanstack/react-query';

import { fetchDefinitions, fetchMyAchievements } from '../api';

export const achievementDefsKey = ['achievements', 'defs'] as const;
export const myAchievementsKey = ['achievements', 'mine'] as const;

export function useAchievementDefinitions() {
  return useQuery({ queryKey: achievementDefsKey, queryFn: fetchDefinitions, staleTime: Infinity });
}
export function useMyAchievements() {
  return useQuery({ queryKey: myAchievementsKey, queryFn: fetchMyAchievements });
}
