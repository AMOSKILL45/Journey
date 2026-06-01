import { isWithinQuietHours } from '../utils/quietHours';

describe('isWithinQuietHours (22h–8h)', () => {
  it('is quiet late night and early morning', () => {
    expect(isWithinQuietHours(23)).toBe(true);
    expect(isWithinQuietHours(2)).toBe(true);
    expect(isWithinQuietHours(7)).toBe(true);
  });
  it('is not quiet during the day', () => {
    expect(isWithinQuietHours(8)).toBe(false);
    expect(isWithinQuietHours(14)).toBe(false);
    expect(isWithinQuietHours(21)).toBe(false);
  });
  it('treats 22 as the start of quiet', () => {
    expect(isWithinQuietHours(22)).toBe(true);
  });
});
