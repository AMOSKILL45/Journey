import { render } from '@testing-library/react-native';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';

const base = {
  id: 'n1',
  user_id: 'u1',
  category: 'join',
  title: 'New traveler',
  body: 'Someone joined your trip.',
  data: {},
  read_at: null,
  created_at: '2026-05-30T00:00:00Z',
} as unknown as AppNotification;

describe('NotificationRow', () => {
  it('renders title and body', () => {
    const { getByText } = render(<NotificationRow notification={base} onPress={jest.fn()} />);
    expect(getByText('New traveler')).toBeTruthy();
    expect(getByText('Someone joined your trip.')).toBeTruthy();
  });

  it('marks unread with a dot', () => {
    const { getByTestId } = render(<NotificationRow notification={base} onPress={jest.fn()} />);
    expect(getByTestId('notification-unread-dot')).toBeTruthy();
  });

  it('hides the dot when read', () => {
    const read = { ...base, read_at: '2026-05-30T01:00:00Z' } as AppNotification;
    const { queryByTestId } = render(<NotificationRow notification={read} onPress={jest.fn()} />);
    expect(queryByTestId('notification-unread-dot')).toBeNull();
  });
});
