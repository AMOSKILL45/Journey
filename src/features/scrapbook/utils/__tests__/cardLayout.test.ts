import { formatCardDistance, formatStatLine } from '../cardLayout';

describe('formatCardDistance', () => {
  it('shows metres below 1 km', () => {
    expect(formatCardDistance(850)).toBe('850 m');
  });

  it('shows whole kilometres at or above 1 km', () => {
    expect(formatCardDistance(1000)).toBe('1 km');
    expect(formatCardDistance(2499)).toBe('2 km');
  });

  it('groups thousands with commas', () => {
    expect(formatCardDistance(1_234_000)).toBe('1,234 km');
  });

  it('clamps negative / non-finite to 0 m', () => {
    expect(formatCardDistance(-5)).toBe('0 m');
    expect(formatCardDistance(Number.NaN)).toBe('0 m');
  });
});

describe('formatStatLine', () => {
  it('formats a distance stat via formatCardDistance', () => {
    expect(formatStatLine('distance', 'Distance', 1500)).toEqual({
      key: 'distance',
      label: 'Distance',
      value: '2 km',
    });
  });

  it('renders non-distance stats as integers', () => {
    expect(formatStatLine('countries', 'Countries', 3)).toEqual({
      key: 'countries',
      label: 'Countries',
      value: '3',
    });
  });

  it('clamps a negative count to 0', () => {
    expect(formatStatLine('checkins', 'Check-ins', -2).value).toBe('0');
  });
});
