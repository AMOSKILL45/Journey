import { render } from '@testing-library/react-native';
import React from 'react';

import WelcomeScreen from '../index';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('WelcomeScreen', () => {
  it('renders app title', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText(/THIS IS THE/)).toBeTruthy();
  });

  it('renders welcome subtitle (English by default)', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Your adventure starts here')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(<WelcomeScreen />);
    expect(getByLabelText('Welcome screen')).toBeTruthy();
  });
});
