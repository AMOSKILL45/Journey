import { render } from '@testing-library/react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';

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

describe('IndexRoute', () => {
  it('redirects unauthenticated users to sign-in', () => {
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
});
