import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockExport = jest.fn((..._args: unknown[]) => Promise.resolve('file:///cache/trip.ics'));
const mockSuccess = jest.fn();

jest.mock('../api', () => ({
  exportTripIcs: (...args: unknown[]) => mockExport(...args),
}));
jest.mock('@features/feedback', () => ({
  haptics: { success: () => mockSuccess() },
}));

import { ExportTripButton } from '../components/ExportTripButton';

const TRIP = { id: 't1', name: 'Trip' };
const DATED = [{ id: 'm1', name: 'Arrive', arrival_at: '2026-06-05T09:00:00Z' }];
const UNDATED = [{ id: 'm2', name: 'Someday', arrival_at: null, departure_at: null }];

describe('ExportTripButton', () => {
  beforeEach(() => {
    mockExport.mockClear();
    mockSuccess.mockClear();
  });

  it('is enabled and exports when a milestone has a date', async () => {
    const { getByRole } = render(<ExportTripButton trip={TRIP} milestones={DATED} />);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(btn);
    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    expect(mockExport).toHaveBeenCalledWith(TRIP, DATED);
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('is disabled and does not export when no milestone has a date', () => {
    const { getByRole } = render(<ExportTripButton trip={TRIP} milestones={UNDATED} />);
    const btn = getByRole('button');
    expect(btn.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(btn);
    expect(mockExport).not.toHaveBeenCalled();
  });
});
