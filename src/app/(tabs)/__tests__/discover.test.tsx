import { fireEvent, render } from '@testing-library/react-native';

import { t } from '@core/i18n';

import DiscoverTab from '../discover';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => mockReplace.mockClear());

describe('DiscoverTab', () => {
  it('renders the shared "coming soon" empty state (no hardcoded copy)', () => {
    const { getByText } = render(<DiscoverTab />);
    expect(getByText(t('emptyStates.discover.title'))).toBeTruthy();
    expect(getByText(t('emptyStates.discover.body'))).toBeTruthy();
  });

  it('routes back to the trips tab from the empty-state action', () => {
    const { getByText } = render(<DiscoverTab />);
    fireEvent.press(getByText(t('emptyStates.discover.action')));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/trips');
  });
});
