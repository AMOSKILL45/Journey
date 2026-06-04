import { mergeStatus, unlockedCount } from '../achievementStatus';
import type { AchievementDefinition, UserAchievement } from '../types';

const def = (id: string, sort_order: number): AchievementDefinition => ({
  id,
  name_key: `n.${id}`,
  description_key: `d.${id}`,
  sprite_id: `s.${id}`,
  rarity: 'common',
  trigger_rule: { type: 'count', metric: 'checkins', gte: 1 },
  sort_order,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
});
const unlock = (achievement_id: string): UserAchievement => ({
  user_id: 'u1',
  achievement_id,
  unlocked_at: '2026-02-02T00:00:00Z',
  trip_id: null,
});

describe('achievementStatus', () => {
  it('merges by sort_order and flags unlocked + date', () => {
    const out = mergeStatus([def('b', 20), def('a', 10)], [unlock('a')]);
    expect(out.map((o) => o.id)).toEqual(['a', 'b']);
    expect(out[0]).toMatchObject({ unlocked: true, unlockedAt: '2026-02-02T00:00:00Z' });
    expect(out[1]).toMatchObject({ unlocked: false, unlockedAt: null });
  });
  it('counts unlocked', () => {
    expect(unlockedCount(mergeStatus([def('a', 1), def('b', 2)], [unlock('a')]))).toBe(1);
  });
});
