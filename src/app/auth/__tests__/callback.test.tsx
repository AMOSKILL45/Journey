import { act, render } from '@testing-library/react-native';
import React from 'react';

import AuthCallbackScreen from '../callback';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>Redirect:{href}</Text>;
  },
}));

const mockUseSession = jest.fn();
jest.mock('@features/auth', () => ({
  useSession: () => mockUseSession(),
}));

describe('AuthCallbackScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockUseSession.mockReset();
  });

  it('redirects to tabs as soon as a session is available', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const { getByText } = render(<AuthCallbackScreen />);
    expect(getByText('Redirect:/(tabs)')).toBeTruthy();
  });

  it('shows a loader while waiting for the deep-link handler to set the session', () => {
    mockUseSession.mockReturnValue({ session: null, loading: true });
    const { queryByText } = render(<AuthCallbackScreen />);
    expect(queryByText(/Redirect/)).toBeNull();
  });

  it('keeps the loader visible after useSession finishes but before timeout', () => {
    // useSession has resolved with no session yet — handler may still be running.
    mockUseSession.mockReturnValue({ session: null, loading: false });
    const { queryByText } = render(<AuthCallbackScreen />);
    expect(queryByText(/Redirect/)).toBeNull();
  });

  it('falls back to sign-in when the session never arrives within the timeout', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });
    const { queryByText, getByText } = render(<AuthCallbackScreen />);
    expect(queryByText(/Redirect/)).toBeNull();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByText('Redirect:/(auth)/sign-in')).toBeTruthy();
  });
});
