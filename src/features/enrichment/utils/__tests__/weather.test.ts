import { MILESTONE_SPRITES } from '@assets/sprites/milestones/manifest';

import {
  WEATHER_CONDITIONS,
  weatherCodeToCondition,
  weatherCodeToIcon,
  weatherCodeToLabelKey,
} from '../weather';

const SPRITE_IDS = new Set(MILESTONE_SPRITES.map((s) => s.id));

describe('weatherCodeToCondition', () => {
  it.each([
    [0, 'clear'],
    [1, 'cloudy'],
    [2, 'cloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'drizzle'],
    [57, 'drizzle'],
    [61, 'rain'],
    [67, 'rain'],
    [71, 'snow'],
    [77, 'snow'],
    [80, 'showers'],
    [82, 'showers'],
    [85, 'snow'],
    [86, 'snow'],
    [95, 'thunderstorm'],
    [99, 'thunderstorm'],
  ])('maps WMO code %i to condition %s', (code, expected) => {
    expect(weatherCodeToCondition(code)).toBe(expected);
  });

  it('falls back to clear for unknown / out-of-range codes', () => {
    expect(weatherCodeToCondition(-5)).toBe('clear');
    expect(weatherCodeToCondition(1234)).toBe('clear');
  });
});

describe('weatherCodeToLabelKey', () => {
  it('returns a weather.* namespaced key for each condition', () => {
    for (const c of WEATHER_CONDITIONS) {
      expect(weatherCodeToLabelKey(weatherCodeForCondition(c))).toBe(`weather.${c}`);
    }
  });

  it('is always under the weather namespace', () => {
    expect(weatherCodeToLabelKey(61)).toBe('weather.rain');
    expect(weatherCodeToLabelKey(0)).toMatch(/^weather\./);
  });
});

describe('weatherCodeToIcon', () => {
  it('returns a sprite id that exists in the milestone sprite manifest for every condition', () => {
    for (const c of WEATHER_CONDITIONS) {
      const id = weatherCodeToIcon(weatherCodeForCondition(c));
      expect(SPRITE_IDS.has(id)).toBe(true);
    }
  });
});

// Representative WMO code per condition bucket, for table-free assertions above.
function weatherCodeForCondition(c: string): number {
  switch (c) {
    case 'clear':
      return 0;
    case 'cloudy':
      return 2;
    case 'fog':
      return 45;
    case 'drizzle':
      return 53;
    case 'rain':
      return 63;
    case 'snow':
      return 73;
    case 'showers':
      return 81;
    case 'thunderstorm':
      return 95;
    default:
      return 0;
  }
}
