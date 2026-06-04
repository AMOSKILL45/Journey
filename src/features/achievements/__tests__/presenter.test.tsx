import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AchievementUnlockPresenter } from '../components/AchievementUnlockPresenter';

const dequeue = jest.fn();
jest.mock('../hooks/useAchievementUnlocks', () => ({
  useAchievementUnlocks: () => mockState,
}));
jest.mock('../hooks/useAchievements', () => ({
  useAchievementDefinitions: () => ({ data: [] }),
}));
let mockState: { current: { id: string; rarity: string } | null; dequeue: () => void };

describe('AchievementUnlockPresenter', () => {
  beforeEach(() => {
    dequeue.mockClear();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('routes a common unlock to the toast', () => {
    mockState = { current: { id: 'first_trip', rarity: 'common' }, dequeue };
    const { getByTestId } = render(<AchievementUnlockPresenter userId="u1" />);
    expect(getByTestId('achievement-toast')).toBeTruthy();
  });

  it('routes a rare+ unlock to the cinematic', async () => {
    mockState = { current: { id: 'countries_5', rarity: 'epic' }, dequeue };
    const { getByTestId } = render(<AchievementUnlockPresenter userId="u1" />);
    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
    // Flush the cinematic's isReduceMotionEnabled() microtask so its setState stays in act().
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('renders nothing when there is no pending unlock', () => {
    mockState = { current: null, dequeue };
    const { queryByTestId } = render(<AchievementUnlockPresenter userId="u1" />);
    expect(queryByTestId('achievement-toast')).toBeNull();
    expect(queryByTestId('worldclear-cinematic')).toBeNull();
  });
});
