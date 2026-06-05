import { formatDistance, formatDuration } from '../distance';

describe('formatDistance', () => {
  it('formats metric km rounded to the nearest km', () => {
    expect(formatDistance(120_000, 'metric')).toBe('120 km');
    expect(formatDistance(120_400, 'metric')).toBe('120 km');
    expect(formatDistance(120_600, 'metric')).toBe('121 km');
  });

  it('formats imperial miles rounded to the nearest mile', () => {
    expect(formatDistance(120_700, 'imperial')).toBe('75 mi');
    expect(formatDistance(1_609, 'imperial')).toBe('1 mi');
    expect(formatDistance(804, 'imperial')).toBe('0 mi');
  });

  it('defaults to metric', () => {
    expect(formatDistance(5_000)).toBe('5 km');
  });

  it('clamps negative / non-finite input to 0', () => {
    expect(formatDistance(-100, 'metric')).toBe('0 km');
    expect(formatDistance(Number.NaN, 'imperial')).toBe('0 mi');
  });
});

describe('formatDuration', () => {
  it('renders minutes only when under an hour', () => {
    expect(formatDuration(2_700)).toBe('45 min');
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(59)).toBe('1 min');
  });

  it('renders h + zero-padded minutes at/over an hour', () => {
    expect(formatDuration(5_400)).toBe('1h30');
    expect(formatDuration(3_600)).toBe('1h00');
    expect(formatDuration(3_660)).toBe('1h01');
    expect(formatDuration(7_200)).toBe('2h00');
  });

  it('rounds to the nearest minute at the boundary', () => {
    // 1h29m30s rounds up to 1h30
    expect(formatDuration(5_370)).toBe('1h30');
    // 59m29s rounds down to 59 min (stays under the hour)
    expect(formatDuration(3_569)).toBe('59 min');
  });

  it('clamps negative / non-finite input to 0', () => {
    expect(formatDuration(-10)).toBe('0 min');
    expect(formatDuration(Number.NaN)).toBe('0 min');
  });
});
