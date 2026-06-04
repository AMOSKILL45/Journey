import { act, render } from '@testing-library/react-native';

import { AchievementToast } from '../components/AchievementToast';

describe('AchievementToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the toast and calls onDone after durationMs elapses', () => {
    const onDone = jest.fn();
    const { getByTestId } = render(
      <AchievementToast name="achievements.defs.first_trip.name" onDone={onDone} durationMs={10} />,
    );

    expect(getByTestId('achievement-toast')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
