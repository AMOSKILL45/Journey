import { AGE_CONFIRMED_KEY, isAgeConfirmed, withAgeConfirmed } from '../utils/ageGate';

describe('account/ageGate', () => {
  describe('isAgeConfirmed', () => {
    it('is false for null / undefined / empty preferences', () => {
      expect(isAgeConfirmed(null)).toBe(false);
      expect(isAgeConfirmed(undefined)).toBe(false);
      expect(isAgeConfirmed({})).toBe(false);
    });

    it('is false when the flag is missing or not exactly true', () => {
      expect(isAgeConfirmed({ notifications: {} })).toBe(false);
      expect(isAgeConfirmed({ [AGE_CONFIRMED_KEY]: false })).toBe(false);
      // truthy-but-not-true must not pass (guards against loose coercion)
      expect(isAgeConfirmed({ [AGE_CONFIRMED_KEY]: 'yes' })).toBe(false);
      expect(isAgeConfirmed({ [AGE_CONFIRMED_KEY]: 1 })).toBe(false);
    });

    it('is true only when the flag is exactly boolean true', () => {
      expect(isAgeConfirmed({ [AGE_CONFIRMED_KEY]: true })).toBe(true);
    });
  });

  describe('withAgeConfirmed', () => {
    it('sets the flag without dropping existing preference keys', () => {
      const prev = { notifications: { trips: true }, readableMode: false };
      const next = withAgeConfirmed(prev);
      expect(next).toEqual({ ...prev, [AGE_CONFIRMED_KEY]: true });
    });

    it('does not mutate the input', () => {
      const prev = { foo: 'bar' };
      const next = withAgeConfirmed(prev);
      expect(prev).toEqual({ foo: 'bar' });
      expect(next).not.toBe(prev);
    });

    it('handles null / undefined preferences', () => {
      expect(withAgeConfirmed(null)).toEqual({ [AGE_CONFIRMED_KEY]: true });
      expect(withAgeConfirmed(undefined)).toEqual({ [AGE_CONFIRMED_KEY]: true });
    });

    it('can clear the flag when passed false', () => {
      expect(withAgeConfirmed({ a: 1 }, false)).toEqual({ a: 1, [AGE_CONFIRMED_KEY]: false });
    });
  });
});
