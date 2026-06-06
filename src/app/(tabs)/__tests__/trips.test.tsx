import { fireEvent, render } from '@testing-library/react-native';

import { t } from '@core/i18n';

const mockUseTrips = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@features/trips', () => ({
  useTrips: () => mockUseTrips(),
  // Lightweight stub so we assert list rendering without the real card/router.
  TripCard: ({ trip }: { trip: { id: string; name: string } }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{trip.name}</Text>;
  },
}));

import TripsTab from '../trips';

describe('TripsTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows a skeleton loading state while trips load', () => {
    mockUseTrips.mockReturnValue({ data: [], isLoading: true, error: null, refetch: jest.fn() });
    const { getByLabelText } = render(<TripsTab />);
    expect(getByLabelText(t('common.loading'))).toBeTruthy();
  });

  it('shows an error state with a retry that refetches', () => {
    const refetch = jest.fn();
    mockUseTrips.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('nope'),
      refetch,
    });
    const { getAllByText, getByLabelText } = render(<TripsTab />);
    // ErrorState shows a headline (title + body currently share common copy), so
    // assert it appears and that the retry control (labelled) drives the refetch.
    expect(getAllByText(t('common.somethingWentWrong')).length).toBeGreaterThan(0);
    fireEvent.press(getByLabelText(t('common.retry')));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state and navigates to create on the action', () => {
    mockUseTrips.mockReturnValue({ data: [], isLoading: false, error: null, refetch: jest.fn() });
    const { getByText } = render(<TripsTab />);
    expect(getByText(t('emptyStates.trips.title'))).toBeTruthy();
    fireEvent.press(getByText(t('emptyStates.trips.action')));
    expect(mockPush).toHaveBeenCalledWith('/(modals)/create-trip');
  });

  it('renders the trip list when trips are present', () => {
    mockUseTrips.mockReturnValue({
      data: [
        { id: 'a', name: 'Iceland' },
        { id: 'b', name: 'Japan' },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText, queryByText } = render(<TripsTab />);
    expect(getByText('Iceland')).toBeTruthy();
    expect(getByText('Japan')).toBeTruthy();
    // The empty-state copy must not be present when the list has items.
    expect(queryByText(t('emptyStates.trips.title'))).toBeNull();
  });
});
