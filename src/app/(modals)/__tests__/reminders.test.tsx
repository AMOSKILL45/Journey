import { fireEvent, render } from '@testing-library/react-native';

import RemindersScreen from '../reminders';
import type { PersonalReminder } from '@features/personal-reminders';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

type RemindersState = {
  data?: PersonalReminder[];
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
};
// `mock`-prefixed so babel-plugin-jest-hoist allows the lazy reference inside the factory.
let mockRemindersState: RemindersState;
const mockRemove = { mutate: jest.fn() };
const mockOpenSheet = jest.fn();

jest.mock('@features/personal-reminders', () => {
  // jest.requireActual (not bare require) keeps eslint's no-require-imports happy;
  // imported bindings cannot be referenced inside a hoisted mock factory.
  const react = jest.requireActual('react') as typeof import('react');
  const rn = jest.requireActual('react-native') as typeof import('react-native');
  const ReminderFormSheet = react.forwardRef<{ open: () => void }>((_props, ref) => {
    react.useImperativeHandle(ref, () => ({ open: mockOpenSheet }));
    return null;
  });
  ReminderFormSheet.displayName = 'ReminderFormSheet';
  const LifeReminderRow = ({ title }: { title: string | null }) =>
    react.createElement(rn.Text, null, title ?? 'row');
  LifeReminderRow.displayName = 'LifeReminderRow';
  return {
    usePersonalReminders: () => mockRemindersState,
    usePersonalReminderActions: () => ({ remove: mockRemove }),
    ReminderFormSheet,
    LifeReminderRow,
  };
});

const reminder = (id: string): PersonalReminder =>
  ({
    id,
    user_id: 'u1',
    reminder_type: 'custom',
    title: `Reminder ${id}`,
    target_date: '2026-12-01',
    created_at: '2026-01-01T00:00:00Z',
  }) as unknown as PersonalReminder;

beforeEach(() => {
  mockRemove.mutate.mockClear();
  mockOpenSheet.mockClear();
  mockRemindersState = {
    data: [reminder('a')],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
});

describe('RemindersScreen (life reminders)', () => {
  it('renders the reminders list', () => {
    const { getByText } = render(<RemindersScreen />);
    expect(getByText('Reminders')).toBeTruthy();
    expect(getByText('Reminder a')).toBeTruthy();
  });

  it('shows the loading skeleton while reminders load', () => {
    mockRemindersState = { data: [], isLoading: true, isError: false, refetch: jest.fn() };
    const { getByTestId } = render(<RemindersScreen />);
    expect(getByTestId('reminders-loading')).toBeTruthy();
  });

  it('shows the error state and retries on press', () => {
    mockRemindersState = { data: [], isLoading: false, isError: true, refetch: jest.fn() };
    const { getByTestId, getByText } = render(<RemindersScreen />);
    expect(getByTestId('reminders-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(getByText('Retry'));
    expect(mockRemindersState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state and opens the form on the action', () => {
    mockRemindersState = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
    const { getByTestId, getByText } = render(<RemindersScreen />);
    expect(getByTestId('reminders-empty')).toBeTruthy();
    fireEvent.press(getByText('Add a reminder'));
    expect(mockOpenSheet).toHaveBeenCalled();
  });
});
