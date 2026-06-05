import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { BossClearCinematic } from '../components/BossClearCinematic';

describe('BossClearCinematic', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the milestone name and calls onDone when skipped', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();
    const { getByText, getByLabelText } = render(
      <BossClearCinematic milestoneName="Mount Doom" onDone={onDone} />,
    );
    expect(getByText(/Mount Doom/)).toBeTruthy();
    fireEvent.press(getByLabelText('boss.skip'));
    expect(onDone).toHaveBeenCalled();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('renders the BOSS CLEARED headline', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();
    const { getByText } = render(<BossClearCinematic milestoneName="Bowser" onDone={onDone} />);
    expect(getByText('BOSS CLEARED!')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('auto-dismisses by calling onDone after durationMs elapses', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();

    const { getByTestId } = render(
      <BossClearCinematic milestoneName="Bowser" onDone={onDone} durationMs={10} />,
    );

    expect(getByTestId('bossclear-cinematic')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    // Flush the pending isReduceMotionEnabled() resolution before advancing the timer.
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders a static frame when reduce motion is enabled', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onDone = jest.fn();

    const { getByTestId } = render(<BossClearCinematic milestoneName="Bowser" onDone={onDone} />);

    expect(getByTestId('bossclear-cinematic')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(getByTestId('bossclear-cinematic')).toBeTruthy();
  });
});
