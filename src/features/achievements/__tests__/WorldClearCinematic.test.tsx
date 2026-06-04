import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { WorldClearCinematic } from '../components/WorldClearCinematic';

const baseProps = {
  id: 'countries_5',
  nameKey: 'achievements.defs.countries_5.name',
  descriptionKey: 'achievements.defs.countries_5.description',
  rarity: 'epic',
};

describe('WorldClearCinematic', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('auto-dismisses by calling onDone after durationMs elapses', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();

    const { getByTestId } = render(
      <WorldClearCinematic {...baseProps} onDone={onDone} durationMs={10} />,
    );

    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    // Flush the pending isReduceMotionEnabled() resolution (a microtask that sets
    // state) before advancing the auto-dismiss timer, so no update escapes act().
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('skips immediately when the skip button is pressed', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();

    const { getByTestId } = render(<WorldClearCinematic {...baseProps} onDone={onDone} />);

    fireEvent.press(getByTestId('worldclear-skip'));

    expect(onDone).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('renders the cinematic with motion enabled (reduce motion off)', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const onDone = jest.fn();

    const { getByTestId } = render(<WorldClearCinematic {...baseProps} onDone={onDone} />);

    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
  });

  it('renders a static reveal when reduce motion is enabled', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onDone = jest.fn();

    const { getByTestId } = render(<WorldClearCinematic {...baseProps} onDone={onDone} />);

    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(getByTestId('worldclear-cinematic')).toBeTruthy();
  });
});
