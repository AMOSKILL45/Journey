import { countryName, flagFor } from '../flags';

describe('flags', () => {
  it('returns the listed flag + name for a known ISO code', () => {
    expect(flagFor('JP')).toBe('🇯🇵');
    expect(countryName('JP')).toBe('Japan');
  });
  it('derives a flag emoji for a valid 2-letter code and is case-insensitive', () => {
    expect(flagFor('kr')).toBe('🇰🇷');
  });
  it('falls back for null / unknown', () => {
    expect(flagFor(null)).toBe('🏳️');
    expect(flagFor('ZZZ')).toBe('🏳️');
    expect(countryName(null)).toBe('');
    expect(countryName('ZZ')).toBe('ZZ');
  });
});
