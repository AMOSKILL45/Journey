import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import InviteTokenScreen from '../[token]';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>Redirect:{href}</Text>;
  },
  useLocalSearchParams: jest.fn(),
}));

const mockUseSession = jest.fn();
const mockAcceptInvitation = jest.fn();

jest.mock('@features/auth', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@features/trips', () => ({
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
}));

const { useLocalSearchParams } = jest.requireMock('expo-router');

const setToken = (token: string | undefined) => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ token });
};

describe('InviteTokenScreen', () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockAcceptInvitation.mockReset();
    (useLocalSearchParams as jest.Mock).mockReset();
  });

  it('accepts the invitation and redirects to the trip detail modal', async () => {
    setToken('abc123');
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    mockAcceptInvitation.mockResolvedValue({ trip_id: 'trip-42' });

    const { findByText } = render(<InviteTokenScreen />);
    expect(await findByText('Redirect:/(modals)/trip/trip-42')).toBeTruthy();
    expect(mockAcceptInvitation).toHaveBeenCalledWith('abc123');
  });

  it('redirects authenticated users to tabs if the invitation fails', async () => {
    setToken('bad-token');
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    mockAcceptInvitation.mockRejectedValue(new Error('expired'));

    const { findByText } = render(<InviteTokenScreen />);
    expect(await findByText('Redirect:/(tabs)')).toBeTruthy();
  });

  it('bounces unauthenticated users to sign-in', async () => {
    setToken('abc123');
    mockUseSession.mockReturnValue({ session: null, loading: false });

    const { findByText } = render(<InviteTokenScreen />);
    expect(await findByText('Redirect:/(auth)/sign-in')).toBeTruthy();
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
  });

  it('redirects to tabs/sign-in if no token is present in the URL', async () => {
    setToken(undefined);
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });

    const { findByText } = render(<InviteTokenScreen />);
    expect(await findByText('Redirect:/(tabs)')).toBeTruthy();
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
  });

  it('shows the loader while the session is still loading', async () => {
    setToken('abc123');
    mockUseSession.mockReturnValue({ session: null, loading: true });

    const { queryByText } = render(<InviteTokenScreen />);
    await waitFor(() => {
      expect(queryByText(/Redirect/)).toBeNull();
    });
  });
});
