import {
  DEFAULT_WORLD_THEME_ID,
  WORLD_THEME_IDS,
  WORLD_THEMES,
  pickWorldTheme,
} from '../utils/worldThemes';

describe('worldThemes', () => {
  it('exposes a manifest for every declared id', () => {
    for (const id of WORLD_THEME_IDS) {
      expect(WORLD_THEMES[id]).toBeDefined();
      expect(WORLD_THEMES[id].id).toBe(id);
    }
  });

  it.each(WORLD_THEME_IDS)('theme %s has all required fields populated', (id) => {
    const theme = WORLD_THEMES[id];
    expect(theme.label).toBeTruthy();
    expect(theme.background).toBeDefined();
    expect(theme.skyTopColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(theme.skyBottomColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(theme.groundColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(theme.accentColors.length).toBeGreaterThan(0);
  });

  describe('pickWorldTheme', () => {
    it('returns the default when no country is given', () => {
      expect(pickWorldTheme()).toBe(DEFAULT_WORLD_THEME_ID);
      expect(pickWorldTheme(null)).toBe(DEFAULT_WORLD_THEME_ID);
      expect(pickWorldTheme('')).toBe(DEFAULT_WORLD_THEME_ID);
    });

    it('maps USA to the desert theme regardless of case', () => {
      expect(pickWorldTheme('US')).toBe('usa-desert');
      expect(pickWorldTheme('us')).toBe('usa-desert');
      expect(pickWorldTheme('USA')).toBe('usa-desert');
    });

    it('falls back to the default for unknown countries', () => {
      expect(pickWorldTheme('ZZ')).toBe(DEFAULT_WORLD_THEME_ID);
      expect(pickWorldTheme('XK')).toBe(DEFAULT_WORLD_THEME_ID);
    });
  });
});

describe('phase 8 world themes', () => {
  it('exposes all five themes', () => {
    expect(WORLD_THEME_IDS).toHaveLength(5);
    expect(WORLD_THEME_IDS).toEqual(
      expect.arrayContaining(['europe-forest', 'asia-sakura', 'tropical-beach']),
    );
  });

  it('every theme exposes the required fields', () => {
    for (const id of WORLD_THEME_IDS) {
      const t = WORLD_THEMES[id];
      expect(t.id).toBe(id);
      expect(typeof t.label).toBe('string');
      // Metro resolves `require('*.png')` to a numeric asset id at runtime; the
      // jest-expo asset transform resolves it to `{ testUri }`. Accept either so
      // the contract ("a real bundled asset reference") holds in both envs.
      expect(t.background).toBeDefined();
      expect(['number', 'object']).toContain(typeof t.background);
      expect(t.skyTopColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.accentColors.length).toBeGreaterThan(0);
    }
  });

  it('maps destination countries to the right theme', () => {
    expect(pickWorldTheme('JP')).toBe('asia-sakura');
    expect(pickWorldTheme('th')).toBe('tropical-beach'); // case-insensitive
    expect(pickWorldTheme('FR')).toBe('europe-forest');
    expect(pickWorldTheme('US')).toBe('usa-desert');
    expect(pickWorldTheme('ZZ')).toBe('adventure-generic'); // fallback
    expect(pickWorldTheme(null)).toBe('adventure-generic');
  });
});
