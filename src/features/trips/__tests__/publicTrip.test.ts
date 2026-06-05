import { supabase } from '@core/supabase/client';

import { fetchPublicMilestones, fetchPublicTripByToken } from '../api/publicTrip';

describe('publicTrip.api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fetches a trip by share token (RLS gates non-private)', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: 't1', name: 'Roadtrip' }, error: null } as never),
    };
    const fromSpy = jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const trip = await fetchPublicTripByToken('abc');
    expect(fromSpy).toHaveBeenCalledWith('trips');
    expect(builder.eq).toHaveBeenCalledWith('share_token', 'abc');
    expect(trip?.name).toBe('Roadtrip');
  });

  it('returns null when the token resolves to nothing (private/not found)', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const trip = await fetchPublicTripByToken('missing');
    expect(trip).toBeNull();
  });

  it('returns null for an empty token without querying', async () => {
    const fromSpy = jest.spyOn(supabase, 'from');
    const trip = await fetchPublicTripByToken('');
    expect(trip).toBeNull();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('throws when supabase returns an error', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    await expect(fetchPublicTripByToken('abc')).rejects.toMatchObject({ message: 'boom' });
  });

  it('fetchPublicMilestones reads milestones for a trip ordered by order_index', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'm1', trip_id: 't1' }], error: null } as never),
    };
    const fromSpy = jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const milestones = await fetchPublicMilestones('t1');
    expect(fromSpy).toHaveBeenCalledWith('milestones');
    expect(builder.eq).toHaveBeenCalledWith('trip_id', 't1');
    expect(builder.order).toHaveBeenCalledWith('order_index', { ascending: true });
    expect(milestones).toEqual([{ id: 'm1', trip_id: 't1' }]);
  });

  it('fetchPublicMilestones returns an empty array when there are none', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: null } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const milestones = await fetchPublicMilestones('t1');
    expect(milestones).toEqual([]);
  });
});

// ---- PublicTripScreen smoke (read-only, view-only, empty state) ----
// Boundary mocks below only affect the screen describe; the api tests above use
// jest.spyOn and don't touch react-query / expo-router / PathView.

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@features/milestones', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  PathView: ({ milestones }: { milestones: unknown[] }) =>
    require('react').createElement(
      require('react-native').Text,
      null,
      `PathView:${milestones.length}`,
    ),
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

describe('PublicTripScreen', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require('react');
  const { useQuery } = require('@tanstack/react-query') as { useQuery: jest.Mock };
  const { render } = require('@testing-library/react-native');
  const { PublicTripScreen } = require('../screens/PublicTripScreen');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const renderScreen = (token: string) => render(React.createElement(PublicTripScreen, { token }));

  beforeEach(() => useQuery.mockReset());

  // useQuery is called in order: trip, milestones, owner. Map by queryKey[0].
  const mockQueries = (byKey: Record<string, unknown>) => {
    useQuery.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      const key = queryKey[0] as string;
      if (key === 'public-trip') {
        return { data: byKey['public-trip'] ?? null, isLoading: false };
      }
      return { data: byKey[key] ?? undefined, isLoading: false };
    });
  };

  it('shows the not-public empty state when the trip is null', () => {
    mockQueries({ 'public-trip': null });
    const { getByText, queryByText } = renderScreen('missing');
    expect(getByText("This trip isn't public.")).toBeTruthy();
    expect(queryByText("You're viewing a shared trip")).toBeNull();
  });

  it('renders the view-only banner + path for a public trip', () => {
    mockQueries({
      'public-trip': { id: 't1', name: 'Roadtrip', owner_id: 'o1', cover_image_url: null },
      'public-milestones': [{ id: 'm1' }, { id: 'm2' }],
      'public-owner': null,
    });
    const { getByText, getAllByText } = renderScreen('abc');
    expect(getByText("You're viewing a shared trip")).toBeTruthy();
    expect(getByText('Roadtrip')).toBeTruthy();
    expect(getByText('PathView:2')).toBeTruthy();
    // Owner not public → anonymous attribution.
    expect(getByText('A traveler')).toBeTruthy();
    // Disabled ask-to-join affordance is present.
    expect(getAllByText('Ask to join').length).toBeGreaterThan(0);
  });

  it('uses the public owner display name when the owner opted in', () => {
    mockQueries({
      'public-trip': { id: 't1', name: 'Roadtrip', owner_id: 'o1', cover_image_url: null },
      'public-milestones': [],
      'public-owner': { id: 'o1', display_name: 'Ana' },
    });
    const { getByText, queryByText } = renderScreen('abc');
    expect(getByText('Ana')).toBeTruthy();
    expect(queryByText('A traveler')).toBeNull();
  });
});
