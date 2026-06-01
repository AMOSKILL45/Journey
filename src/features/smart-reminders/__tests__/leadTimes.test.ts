import { daysBetween, nextDueLeadTime } from '../utils/leadTimes';

describe('leadTimes', () => {
  it('daysBetween counts whole days (UTC)', () => {
    expect(daysBetween('2026-06-01', '2026-06-08')).toBe(7);
    expect(daysBetween('2026-06-08', '2026-06-01')).toBe(-7);
  });
  it('fires the largest unfired lead time at/under daysUntil', () => {
    expect(nextDueLeadTime(58, [60, 30, 7], [])).toBe(60);
  });
  it('does not refire an already-fired lead time (waits until the next is due)', () => {
    expect(nextDueLeadTime(58, [60, 30, 7], [60])).toBeNull();
  });
  it('fires the next lead time once its window arrives', () => {
    expect(nextDueLeadTime(28, [60, 30, 7], [60])).toBe(30);
  });
  it('returns null when no lead time is due yet', () => {
    expect(nextDueLeadTime(75, [60, 30, 7], [])).toBeNull();
  });
  it('steps down one per call when behind schedule', () => {
    expect(nextDueLeadTime(5, [60, 30, 7], [60, 30])).toBe(7);
  });
  it('returns null when all fired', () => {
    expect(nextDueLeadTime(2, [60, 30, 7], [60, 30, 7])).toBeNull();
  });
});
