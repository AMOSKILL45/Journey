import { fireEvent, render } from '@testing-library/react-native';

import { t } from '@core/i18n';

const mockUseTrips = jest.fn();
const mockUseProfile = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@features/trips', () => ({ useTrips: () => mockUseTrips() }));
jest.mock('@features/profile', () => ({ useProfile: () => mockUseProfile() }));

jest.mock('@features/checklists', () => ({
  HomeChecklistSummary: () => null,
}));

jest.mock('@features/identity', () => ({
  PassportExpiryBanner: () => null,
}));

import HomeTab from '../index';

const futureTrip = {
  id: 'a',
  name: 'Iceland',
  start_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
};

describe('HomeTab', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({ data: { display_name: 'Ana' } });
  });
  afterEach(() => jest.clearAllMocks());

  it('shows a loading state while trips load', () => {
    mockUseTrips.mockReturnValue({ data: [], isLoading: true, error: null, refetch: jest.fn() });
    const { getByLabelText } = render(<HomeTab />);
    expect(getByLabelText(t('common.loading'))).toBeTruthy();
  });

  it('shows an error state with a retry that refetches', () => {
    const refetch = jest.fn();
    mockUseTrips.mockReturnValue({ data: [], isLoading: false, error: new Error('x'), refetch });
    const { getByLabelText } = render(<HomeTab />);
    fireEvent.press(getByLabelText(t('common.retry')));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the shared empty state (emoji-free) when there are no trips', () => {
    mockUseTrips.mockReturnValue({ data: [], isLoading: false, error: null, refetch: jest.fn() });
    const { getByText } = render(<HomeTab />);
    expect(getByText(t('emptyStates.trips.title'))).toBeTruthy();
    fireEvent.press(getByText(t('emptyStates.trips.action')));
    expect(mockPush).toHaveBeenCalledWith('/(modals)/create-trip');
  });

  it('shows the next-trip card when an upcoming trip exists', () => {
    mockUseTrips.mockReturnValue({
      data: [futureTrip],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText, queryByText } = render(<HomeTab />);
    expect(getByText('Iceland')).toBeTruthy();
    expect(getByText(t('home.nextTrip'))).toBeTruthy();
    // The empty-state copy must not show when a trip is present.
    expect(queryByText(t('emptyStates.trips.title'))).toBeNull();
  });
});
