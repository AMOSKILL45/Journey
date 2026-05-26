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
      expect(pickWorldTheme('FR')).toBe(DEFAULT_WORLD_THEME_ID);
      expect(pickWorldTheme('JP')).toBe(DEFAULT_WORLD_THEME_ID);
    });
  });
});
