import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { OnboardingCarousel } from '../components/OnboardingCarousel';
import { ONBOARDING_SCREENS } from '../data/screens';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
    SafeAreaView: ({ children }: { children: ReactNode }) => <View>{children}</View>,
  };
});

const LAST = ONBOARDING_SCREENS.length - 1;

describe('OnboardingCarousel', () => {
  it('renders the Skip control and the first-screen CTA as "Next"', () => {
    const { getByTestId } = render(<OnboardingCarousel onComplete={jest.fn()} />);
    expect(getByTestId('onboarding-skip')).toBeTruthy();
    // First screen is not the last → CTA reads "Next".
    expect(within(getByTestId('onboarding-next')).getByText('Next')).toBeTruthy();
  });

  it('exposes the active page on the dots progressbar (one per screen)', () => {
    const { UNSAFE_getAllByProps } = render(<OnboardingCarousel onComplete={jest.fn()} />);
    const [progressbar] = UNSAFE_getAllByProps({ accessibilityRole: 'progressbar' });
    expect(progressbar.props.accessibilityValue).toEqual({
      min: 1,
      max: ONBOARDING_SCREENS.length,
      now: 1,
    });
  });

  it('Skip immediately fires onComplete (persists flag at the call site)', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingCarousel onComplete={onComplete} />);
    fireEvent.press(getByTestId('onboarding-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('Next advances through pages and the final CTA becomes "Get started"', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingCarousel onComplete={onComplete} />);

    // Advance to the last screen (N screens → N-1 Next presses).
    for (let i = 0; i < LAST; i += 1) {
      fireEvent.press(getByTestId('onboarding-next'));
    }
    expect(within(getByTestId('onboarding-next')).getByText('Get started')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('pressing the CTA on the last screen fires onComplete', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingCarousel onComplete={onComplete} />);
    for (let i = 0; i < ONBOARDING_SCREENS.length; i += 1) {
      fireEvent.press(getByTestId('onboarding-next'));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reflects the active page on the dots progressbar as the index advances', () => {
    const { getByTestId, UNSAFE_getAllByProps } = render(
      <OnboardingCarousel onComplete={jest.fn()} />,
    );
    fireEvent.press(getByTestId('onboarding-next'));
    const [progressbar] = UNSAFE_getAllByProps({ accessibilityRole: 'progressbar' });
    expect(progressbar.props.accessibilityValue.now).toBe(2);
  });
});
