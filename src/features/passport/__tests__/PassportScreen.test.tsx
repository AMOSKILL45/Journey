import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { PassportScreen } from '../screens/PassportScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

let mockState: {
  data: { stamps: unknown[]; countries: string[] } | undefined;
  isLoading: boolean;
  refetch: () => void;
};
jest.mock('../hooks/usePassport', () => ({ usePassport: () => mockState }));

describe('PassportScreen', () => {
  it('shows the empty state with zero counts', () => {
    mockState = { data: { stamps: [], countries: [] }, isLoading: false, refetch: jest.fn() };
    const { getByText } = render(<PassportScreen />);
    expect(getByText('Passport')).toBeTruthy();
    expect(getByText('0 countries · 0 stamps')).toBeTruthy();
    expect(getByText('Check in to your first milestone to earn a stamp.')).toBeTruthy();
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
      refetch: jest.fn(),
    };
    const { getByTestId } = render(<PassportScreen />);
    expect(getByTestId('stamp-m1')).toBeTruthy();
  });
});
