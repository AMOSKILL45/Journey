/**
 * World themes for the overworld layer. Phase 3 launches with two themes
 * per spec section 6.3 — additional themes (Europe Forest, Asia Sakura,
 * Tropical Beach) land in Phase 8.
 *
 * Background art under `src/assets/worldThemes/<id>/background.png` is a
 * placeholder gradient that will be replaced with hand-crafted pixel art
 * in Phase 8 (cf. Bold Gambits).
 *
 * `background` is typed as `number` — the Metro-resolved asset id returned
 * by `require()`. This is assignable both to RN's `ImageSourcePropType`
 * (for `<Image>`) and to Skia's `DataSourceParam` (for `useImage`).
 */
export type WorldThemeId = 'adventure-generic' | 'usa-desert';

export interface WorldTheme {
  id: WorldThemeId;
  label: string;
  background: number;
  skyTopColor: string;
  skyBottomColor: string;
  groundColor: string;
  accentColors: readonly string[];
}

export const WORLD_THEMES: Record<WorldThemeId, WorldTheme> = {
  'adventure-generic': {
    id: 'adventure-generic',
    label: 'Adventure',
    background: require('../../../assets/worldThemes/adventure-generic/background.png'),
    skyTopColor: '#FFCB05',
    skyBottomColor: '#E63946',
    groundColor: '#7DA847',
    accentColors: ['#6BBFE2', '#FFCB05', '#E63946', '#2A9D8F'],
  },
  'usa-desert': {
    id: 'usa-desert',
    label: 'Desert',
    background: require('../../../assets/worldThemes/usa-desert/background.png'),
    skyTopColor: '#FFB174',
    skyBottomColor: '#FCE4B6',
    groundColor: '#FCE4B6',
    accentColors: ['#3C8DBC', '#D6362B', '#7DA847'],
  },
};

export const DEFAULT_WORLD_THEME_ID: WorldThemeId = 'adventure-generic';

const COUNTRY_THEME_OVERRIDES: Record<string, WorldThemeId> = {
  US: 'usa-desert',
  USA: 'usa-desert',
};

/**
 * Picks a world theme from a trip's destination country (ISO 2-letter or 3-letter
 * code, case-insensitive). Falls back to the default Adventure Generic theme
 * for any country we don't have a dedicated theme for yet.
 */
export function pickWorldTheme(country?: string | null): WorldThemeId {
  if (!country) return DEFAULT_WORLD_THEME_ID;
  return COUNTRY_THEME_OVERRIDES[country.toUpperCase()] ?? DEFAULT_WORLD_THEME_ID;
}

export const WORLD_THEME_IDS: readonly WorldThemeId[] = Object.keys(WORLD_THEMES) as WorldThemeId[];
