import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { t } from '@core/i18n';

import { PublicProfileScreen } from '../PublicProfileScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

type QueryState = { data: unknown; isLoading: boolean };
let mockState: QueryState;
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => mockState,
}));

const GHOST_ID = 'de1e7e00-0000-4000-8000-000000000000';

const baseProfile = {
  display_name: 'Ana',
  username: 'ana',
  avatar_sprite_id: null,
  avatar_color: null,
  bio: null,
  is_verified: false,
  gender: null,
  age_range: null,
  countries_visited: [],
  badges: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PublicProfileScreen', () => {
  it('shows the shared loading state while fetching', () => {
    mockState = { data: undefined, isLoading: true };
    const { getByLabelText } = render(<PublicProfileScreen userId="u1" />);
    expect(getByLabelText(t('common.loading'))).toBeTruthy();
  });

  it('shows the private empty state (no PII) when no profile is returned', () => {
    mockState = { data: null, isLoading: false };
    const { getByText } = render(<PublicProfileScreen userId="u1" />);
    expect(getByText(t('emptyStates.publicProfile.title'))).toBeTruthy();
    expect(getByText(t('emptyStates.publicProfile.body'))).toBeTruthy();
    fireEvent.press(getByText(t('emptyStates.publicProfile.action')));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders the resolved display name for a normal profile', () => {
    mockState = { data: { ...baseProfile }, isLoading: false };
    const { getByText } = render(<PublicProfileScreen userId="u1" />);
    expect(getByText('Ana')).toBeTruthy();
  });

  it('renders the ghost name when the viewed profile is the deletion sentinel', () => {
    mockState = { data: { ...baseProfile, display_name: null, username: null }, isLoading: false };
    const { getByText } = render(<PublicProfileScreen userId={GHOST_ID} />);
    expect(getByText(t('account.ghostName'))).toBeTruthy();
  });

  it('falls back to the ghost name when a public profile has no name at all', () => {
    mockState = { data: { ...baseProfile, display_name: null, username: null }, isLoading: false };
    const { getByText } = render(<PublicProfileScreen userId="u1" />);
    expect(getByText(t('account.ghostName'))).toBeTruthy();
  });
});
