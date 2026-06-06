import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { InboxScreen } from '../screens/InboxScreen';
import type { AppNotification } from '../api/notifications';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }));

type NotifState = {
  data?: AppNotification[];
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
};
let mockNotifState: NotifState;
const mockMarkRead = { mutate: jest.fn() };
jest.mock('../hooks/useNotifications', () => ({
  useNotifications: () => mockNotifState,
  useNotificationMutations: () => ({ markRead: mockMarkRead }),
}));

jest.mock('@features/personal-reminders', () => ({
  usePersonalReminders: () => ({ data: [] }),
  LifeReminderRow: () => null,
}));

const notif = (id: string, read: boolean): AppNotification =>
  ({
    id,
    user_id: 'u1',
    category: 'join',
    title: `Title ${id}`,
    body: 'Body',
    data: {},
    read_at: read ? '2026-01-01T00:00:00Z' : null,
    created_at: '2026-01-01T00:00:00Z',
  }) as unknown as AppNotification;

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockMarkRead.mutate.mockClear();
  mockNotifState = {
    data: [notif('a', false)],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
});

describe('InboxScreen', () => {
  it('renders the notifications list by default with selected tab state', () => {
    const { getByText, getByTestId } = render(<InboxScreen />);
    expect(getByText('Inbox')).toBeTruthy();
    expect(getByText('Title a')).toBeTruthy();
    expect(getByTestId('inbox-tab-notifications').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByTestId('inbox-tab-life').props.accessibilityState).toEqual({ selected: false });
  });

  it('shows the loading skeleton while notifications load', () => {
    mockNotifState = { data: [], isLoading: true, isError: false, refetch: jest.fn() };
    const { getByTestId } = render(<InboxScreen />);
    expect(getByTestId('inbox-loading')).toBeTruthy();
  });

  it('shows the error state and retries on press', () => {
    mockNotifState = { data: [], isLoading: false, isError: true, refetch: jest.fn() };
    const { getByTestId, getByText } = render(<InboxScreen />);
    expect(getByTestId('inbox-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(getByText('Retry'));
    expect(mockNotifState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the shared empty state and routes to trips', () => {
    mockNotifState = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
    const { getByTestId, getByText } = render(<InboxScreen />);
    expect(getByTestId('inbox-empty')).toBeTruthy();
    fireEvent.press(getByText('Explore trips'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/trips');
  });

  it('switches to the life-reminders tab and shows its empty state', () => {
    mockNotifState = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
    const { getByTestId, getByText } = render(<InboxScreen />);
    fireEvent.press(getByTestId('inbox-tab-life'));
    expect(getByTestId('inbox-life-empty')).toBeTruthy();
    fireEvent.press(getByText('Add a reminder'));
    expect(mockPush).toHaveBeenCalledWith('/(modals)/reminders');
  });
});
