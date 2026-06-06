import { render } from '@testing-library/react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';

import { useOnboardingFlags } from '@features/onboarding/store/onboardingFlags';

import IndexRoute from '../index';

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

// Default the persisted onboarding flags to "hydrated + intro already seen" so
// the pre-existing session redirects below behave as they did before 10A.
function setFlags(introSeen: boolean, hydrated: boolean) {
  useOnboardingFlags.setState({ introSeen, hydrated });
}

describe('IndexRoute', () => {
  beforeEach(() => {
    setFlags(true, true);
  });

  it('redirects unauthenticated users who have seen the intro to sign-in', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });
    const { getByText } = render(<IndexRoute />);
    expect(getByText('Redirect:/(auth)/sign-in')).toBeTruthy();
  });

  it('redirects authenticated users to tabs', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const { getByText } = render(<IndexRoute />);
    expect(getByText('Redirect:/(tabs)')).toBeTruthy();
  });

  it('shows a neutral cream fallback (no spinner, no redirect) while the session loads', () => {
    mockUseSession.mockReturnValue({ session: null, loading: true });
    const { queryByText, UNSAFE_queryByType } = render(<IndexRoute />);
    expect(queryByText(/Redirect/)).toBeNull();
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('routes first-run unauthenticated users to the onboarding intro (10A gate)', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });
    setFlags(false, true);
    const { getByText } = render(<IndexRoute />);
    expect(getByText('Redirect:/(onboarding)/intro')).toBeTruthy();
  });

  it('does NOT show the intro once it has been seen', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });
    setFlags(true, true);
    const { getByText } = render(<IndexRoute />);
    expect(getByText('Redirect:/(auth)/sign-in')).toBeTruthy();
  });

  it('holds (no redirect) until persisted flags hydrate, avoiding an intro flash', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false });
    setFlags(false, false);
    const { queryByText } = render(<IndexRoute />);
    expect(queryByText(/Redirect/)).toBeNull();
  });

  it('prefers the tabs redirect for a session even before flags hydrate', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    setFlags(false, true);
    const { getByText } = render(<IndexRoute />);
    expect(getByText('Redirect:/(tabs)')).toBeTruthy();
  });
});
