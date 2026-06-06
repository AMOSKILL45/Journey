import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { PassportScreen } from '../screens/PassportScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));

jest.mock('../api', () => ({ rebuildMyPassport: jest.fn(() => Promise.resolve()) }));

type PassportState = {
  data: { stamps: unknown[]; countries: string[] } | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};
let mockState: PassportState;
jest.mock('../hooks/usePassport', () => ({ usePassport: () => mockState }));

beforeEach(() => mockReplace.mockClear());

describe('PassportScreen', () => {
  it('shows the shared empty state with zero counts and routes to trips', () => {
    mockState = {
      data: { stamps: [], countries: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    const { getByText, getByTestId } = render(<PassportScreen />);
    expect(getByText('Passport')).toBeTruthy();
    expect(getByText('0 countries · 0 stamps')).toBeTruthy();
    expect(getByTestId('passport-empty')).toBeTruthy();
    fireEvent.press(getByText('Open a trip'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/trips');
  });

  it('renders a stamp when present', () => {
    mockState = {
      data: {
        stamps: [
          { milestone_id: 'm1', trip_id: 't1', label: 'A', country: 'JP', at: '2026-01-01' },
        ],
        countries: ['JP'],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    const { getByTestId } = render(<PassportScreen />);
    expect(getByTestId('stamp-m1')).toBeTruthy();
  });

  it('shows the loading skeleton on first load (no cached data)', () => {
    mockState = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
    const { getByTestId } = render(<PassportScreen />);
    expect(getByTestId('passport-loading')).toBeTruthy();
  });

  it('shows the error state when the first load fails', () => {
    mockState = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    const { getByTestId } = render(<PassportScreen />);
    const error = getByTestId('passport-error');
    expect(error).toBeTruthy();
    expect(error.props.accessibilityRole).toBe('alert');
  });
});
