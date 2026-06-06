import { fireEvent, render } from '@testing-library/react-native';

import type { Milestone } from '../api/milestones';

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.View };
});

jest.mock('@features/feedback', () => ({
  haptics: { light: jest.fn(), medium: jest.fn(), error: jest.fn() },
}));

jest.mock('@features/enrichment', () => ({
  WeatherBadge: () => null,
  useMilestoneWeather: () => ({ data: undefined }),
}));

jest.mock('@assets/sprites/milestones/manifest', () => ({
  findSpriteById: () => undefined,
}));

import { haptics } from '@features/feedback';

import { MilestoneNode } from '../components/MilestoneNode';

const mockHaptics = haptics as unknown as {
  light: jest.Mock;
  medium: jest.Mock;
  error: jest.Mock;
};

const milestone = (over: Partial<Milestone> = {}): Milestone =>
  ({ id: 'm1', name: 'Eiffel Tower', is_boss: false, sprite_id: null, ...over }) as Milestone;

describe('MilestoneNode', () => {
  afterEach(() => jest.clearAllMocks());

  it('labels the node with the milestone name only (no raw english state suffix)', () => {
    const { getByLabelText, queryByLabelText } = render(
      <MilestoneNode milestone={milestone()} state="current" />,
    );
    expect(getByLabelText('Eiffel Tower')).toBeTruthy();
    // The old "<name>, <state>" hardcoded-state label must be gone.
    expect(queryByLabelText('Eiffel Tower, current')).toBeNull();
  });

  it('marks a locked node as disabled and a current node as selected', () => {
    const locked = render(<MilestoneNode milestone={milestone()} state="locked" />);
    expect(locked.getByLabelText('Eiffel Tower').props.accessibilityState?.disabled).toBe(true);

    const current = render(<MilestoneNode milestone={milestone()} state="current" />);
    expect(current.getByLabelText('Eiffel Tower').props.accessibilityState?.selected).toBe(true);
  });

  it('does not fire onPress (only error haptic) when locked', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <MilestoneNode milestone={milestone()} state="locked" onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('Eiffel Tower'));
    expect(onPress).not.toHaveBeenCalled();
    expect(mockHaptics.error).toHaveBeenCalled();
  });

  it('fires onPress with a light haptic when reachable', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <MilestoneNode milestone={milestone()} state="current" onPress={onPress} />,
    );
    fireEvent.press(getByLabelText('Eiffel Tower'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockHaptics.light).toHaveBeenCalled();
  });
});
