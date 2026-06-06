import { render } from '@testing-library/react-native';

import { AchievementBadge } from '../components/AchievementBadge';
import type { AchievementWithStatus } from '../types';

const base: AchievementWithStatus = {
  id: 'first_trip',
  name_key: 'achievements.defs.first_trip.name',
  description_key: 'achievements.defs.first_trip.description',
  sprite_id: 'badge_first_trip',
  rarity: 'common',
  trigger_rule: {},
  sort_order: 10,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  unlocked: false,
  unlockedAt: null,
};

describe('AchievementBadge', () => {
  it('renders locked vs unlocked testIDs', () => {
    const locked = render(<AchievementBadge def={base} />);
    expect(locked.getByTestId('badge-first_trip-locked')).toBeTruthy();
    const unlocked = render(<AchievementBadge def={{ ...base, unlocked: true }} />);
    expect(unlocked.getByTestId('badge-first_trip-unlocked')).toBeTruthy();
  });

  it('exposes a single SR element labelled with name + lock state', () => {
    // Locked: "Bon Voyage, Locked" (name resolves from achievements.defs.first_trip.name).
    const locked = render(<AchievementBadge def={base} />);
    const lockedNode = locked.getByTestId('badge-first_trip-locked');
    expect(lockedNode.props.accessible).toBe(true);
    expect(lockedNode.props.accessibilityLabel).toBe('Bon Voyage, Locked');

    const unlocked = render(<AchievementBadge def={{ ...base, unlocked: true }} />);
    expect(unlocked.getByTestId('badge-first_trip-unlocked').props.accessibilityLabel).toBe(
      'Bon Voyage',
    );
  });
});
