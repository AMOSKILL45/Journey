import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AchievementsScreen } from '../screens/AchievementsScreen';
import type { AchievementDefinition, UserAchievement } from '../types';

const def = (id: string, sort_order: number): AchievementDefinition => ({
  id,
  name_key: `achievements.defs.${id}.name`,
  description_key: `achievements.defs.${id}.description`,
  sprite_id: `badge_${id}`,
  rarity: 'common',
  trigger_rule: { type: 'count', metric: 'checkins', gte: 1 },
  sort_order,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
});

const mockDefs: AchievementDefinition[] = [def('first_trip', 10), def('first_checkin', 30)];
const mockMine: UserAchievement[] = [
  {
    user_id: 'u1',
    achievement_id: 'first_trip',
    unlocked_at: '2026-02-02T00:00:00Z',
    trip_id: null,
  },
];

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../hooks/useAchievements', () => ({
  useAchievementDefinitions: () => ({ data: mockDefs, isLoading: false }),
  useMyAchievements: () => ({ data: mockMine, isLoading: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AchievementsScreen', () => {
  it('renders the title and a badge per merged definition (unlocked + locked)', () => {
    const { getByText, getByTestId } = render(<AchievementsScreen />, { wrapper });

    expect(getByText('Achievements')).toBeTruthy();
    expect(getByText('1/2 unlocked')).toBeTruthy();
    expect(getByTestId('badge-first_trip-unlocked')).toBeTruthy();
    expect(getByTestId('badge-first_checkin-locked')).toBeTruthy();
  });
});
