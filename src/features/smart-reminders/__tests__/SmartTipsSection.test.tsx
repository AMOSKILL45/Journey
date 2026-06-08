import { fireEvent, render, screen } from '@testing-library/react-native';

import { SmartTipsSection } from '../components/SmartTipsSection';

const mockUseSmartReminders = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../hooks/useSmartReminders', () => ({
  useSmartReminders: (tripId: string) => mockUseSmartReminders(tripId),
  useSmartReminderActions: () => ({
    markDone: { mutate: jest.fn() },
    snooze: { mutate: jest.fn() },
    dismiss: { mutate: jest.fn() },
  }),
}));

jest.mock('../hooks/useKbRules', () => ({
  useKbRules: () => ({ byId: {} }),
  useReportKbRule: () => ({ mutate: jest.fn() }),
}));

describe('SmartTipsSection', () => {
  beforeEach(() => {
    mockUseSmartReminders.mockReset();
    mockRefetch.mockReset();
  });

  it('renders nothing while loading', () => {
    mockUseSmartReminders.mockReturnValue({ data: [], isLoading: true, isError: false });
    const { toJSON } = render(<SmartTipsSection tripId="t1" />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when there are no pending tips (no empty paralysis)', () => {
    mockUseSmartReminders.mockReturnValue({
      data: [{ id: 'r1', requirement_id: 'us_esta', status: 'done' }],
      isLoading: false,
      isError: false,
    });
    const { toJSON } = render(<SmartTipsSection tripId="t1" />);
    expect(toJSON()).toBeNull();
  });

  it('renders a recoverable ErrorState on query error', () => {
    mockUseSmartReminders.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });
    render(<SmartTipsSection tripId="t1" />);
    // Container is a polite live region (role=alert) for SR announcement.
    expect(screen.getByTestId('smarttips-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders the pending tips when present', () => {
    mockUseSmartReminders.mockReturnValue({
      data: [{ id: 'r1', requirement_id: 'us_esta', status: 'pending' }],
      isLoading: false,
      isError: false,
    });
    render(<SmartTipsSection tripId="t1" />);
    expect(screen.getByTestId('smarttip-done')).toBeTruthy();
  });
});
