import {
  MIN_NAME_LENGTH,
  isValidE164PhoneNumber,
  toISODateOrNull,
} from '../utils/onboardingValidation';

describe('onboardingValidation', () => {
  describe('isValidE164PhoneNumber', () => {
    it('accepts a clean +33 mobile', () => {
      expect(isValidE164PhoneNumber('+33612345678')).toBe(true);
    });

    it('accepts +1 US number', () => {
      expect(isValidE164PhoneNumber('+14155552671')).toBe(true);
    });

    it('strips spaces and dashes before validating', () => {
      expect(isValidE164PhoneNumber('+33 6 12-34-56-78')).toBe(true);
    });

    it('rejects missing + prefix', () => {
      expect(isValidE164PhoneNumber('33612345678')).toBe(false);
    });

    it('rejects leading 0 after +', () => {
      expect(isValidE164PhoneNumber('+0612345678')).toBe(false);
    });

    it('rejects too short', () => {
      expect(isValidE164PhoneNumber('+331')).toBe(false);
    });

    it('rejects too long (>15 digits total)', () => {
      expect(isValidE164PhoneNumber('+1234567890123456')).toBe(false);
    });

    it('rejects letters', () => {
      expect(isValidE164PhoneNumber('+33ABCDEFGHI')).toBe(false);
    });
  });

  describe('toISODateOrNull', () => {
    it('returns null for null', () => {
      expect(toISODateOrNull(null)).toBeNull();
    });

    it('returns YYYY-MM-DD slice of ISO', () => {
      expect(toISODateOrNull(new Date('2030-06-15T12:34:56Z'))).toBe('2030-06-15');
    });
  });

  describe('MIN_NAME_LENGTH', () => {
    it('is 2', () => {
      // Guard against silent loosening of the form validation contract.
      expect(MIN_NAME_LENGTH).toBe(2);
    });
  });
});
