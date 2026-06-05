import { isValidCaption, MAX_CAPTION_LENGTH, normalizeCaption } from '../utils/caption';

describe('normalizeCaption', () => {
  it('trims whitespace', () => {
    expect(normalizeCaption('  hi  ')).toBe('hi');
  });

  it('coerces empty / whitespace-only / null to null', () => {
    expect(normalizeCaption('')).toBeNull();
    expect(normalizeCaption('   ')).toBeNull();
    expect(normalizeCaption(null)).toBeNull();
    expect(normalizeCaption(undefined)).toBeNull();
  });
});

describe('isValidCaption', () => {
  it('allows empty captions', () => {
    expect(isValidCaption('')).toBe(true);
    expect(isValidCaption(null)).toBe(true);
  });

  it('allows captions up to the cap', () => {
    expect(isValidCaption('a'.repeat(MAX_CAPTION_LENGTH))).toBe(true);
  });

  it('rejects captions over the cap', () => {
    expect(isValidCaption('a'.repeat(MAX_CAPTION_LENGTH + 1))).toBe(false);
  });
});
