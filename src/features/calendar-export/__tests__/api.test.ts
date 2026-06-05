const mockWrite = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockShareAsync = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockIsAvailable = jest.fn(() => Promise.resolve(true));

// The factory declares `File` inline: jest forbids a factory from closing over
// out-of-scope identifiers that are not `mock`-prefixed (the documents tests use
// the same pattern). The jest.fn spies are `mock`-prefixed, so referencing them
// from inside the factory is allowed.
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    exists = false;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    create = mockCreate;
    write = mockWrite;
    delete = mockDelete;
  },
  Paths: { cache: { uri: 'file:///cache/' } },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

import { exportTripIcs, ICS_MIME_TYPE, SharingUnavailableError, tripIcsFileName } from '../api';

const TRIP = { id: 't1', name: 'Summer Trip' };
const MILESTONES = [{ id: 'm1', name: 'Arrive', arrival_at: '2026-06-05T09:00:00Z' }];

describe('calendar-export api', () => {
  beforeEach(() => {
    mockWrite.mockClear();
    mockCreate.mockClear();
    mockDelete.mockClear();
    mockShareAsync.mockClear();
    mockIsAvailable.mockReturnValue(Promise.resolve(true));
  });

  it('derives a slugged .ics filename from the trip name', () => {
    expect(tripIcsFileName(TRIP)).toBe('summer-trip.ics');
  });

  it('exposes the iCalendar mime type', () => {
    expect(ICS_MIME_TYPE).toBe('text/calendar');
  });

  it('writes the .ics to the cache dir and shares it with the calendar mime type', async () => {
    const uri = await exportTripIcs(TRIP, MILESTONES);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = mockWrite.mock.calls[0][0] as string;
    expect(written.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(written).toContain('UID:m1@journey.app');

    expect(uri).toBe('file:///cache/summer-trip.ics');
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/summer-trip.ics',
      expect.objectContaining({ mimeType: 'text/calendar' }),
    );
  });

  it('throws SharingUnavailableError and does not write when sharing is unavailable', async () => {
    mockIsAvailable.mockReturnValue(Promise.resolve(false));
    await expect(exportTripIcs(TRIP, MILESTONES)).rejects.toBeInstanceOf(SharingUnavailableError);
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
