// Pure mapping of WMO weather interpretation codes → pixel sprite + i18n label key.
//
// WMO code reference (Open-Meteo `current.weather_code`):
//   0 clear · 1-3 mainly clear/partly cloudy/overcast · 45,48 fog · 51-57 drizzle ·
//   61-67 rain · 71-77 snow · 80-82 rain showers · 85,86 snow showers · 95-99 thunderstorm.
//
// Real weather pixel-art is not shipped yet (asset task). Until then each condition reuses an
// existing milestone sprite as a placeholder so Metro bundles a real require() and the sprite-
// manifest contract test stays green. Swap WEATHER_SPRITE_BY_CONDITION for dedicated weather
// sprites when they land — the public API (icon id + label key) does not change.
import type { MilestoneSpriteId } from '@assets/sprites/milestones/manifest';

export const WEATHER_CONDITIONS = [
  'clear',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'showers',
  'thunderstorm',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

// Placeholder sprite per condition (all ∈ milestone sprite manifest — asserted by contracts).
const WEATHER_SPRITE_BY_CONDITION: Record<WeatherCondition, MilestoneSpriteId> = {
  clear: 'milestones/star_gold',
  cloudy: 'milestones/city_night',
  fog: 'milestones/marker_blue',
  drizzle: 'milestones/coffee',
  rain: 'milestones/boat',
  snow: 'milestones/diamond',
  showers: 'milestones/surf',
  thunderstorm: 'milestones/star_silver',
};

/** Map a WMO weather code to a coarse condition bucket. Unknown codes fall back to `clear`. */
export function weatherCodeToCondition(wmoCode: number): WeatherCondition {
  if (wmoCode <= 0) return 'clear';
  if (wmoCode <= 3) return 'cloudy';
  if (wmoCode === 45 || wmoCode === 48) return 'fog';
  if (wmoCode >= 51 && wmoCode <= 57) return 'drizzle';
  if (wmoCode >= 61 && wmoCode <= 67) return 'rain';
  if (wmoCode >= 71 && wmoCode <= 77) return 'snow';
  if (wmoCode >= 80 && wmoCode <= 82) return 'showers';
  if (wmoCode >= 85 && wmoCode <= 86) return 'snow';
  if (wmoCode >= 95 && wmoCode <= 99) return 'thunderstorm';
  return 'clear';
}

/** WMO weather code → placeholder pixel sprite id (∈ milestone sprite manifest). */
export function weatherCodeToIcon(wmoCode: number): MilestoneSpriteId {
  return WEATHER_SPRITE_BY_CONDITION[weatherCodeToCondition(wmoCode)];
}

/** WMO weather code → i18n key under the `weather.*` namespace, e.g. `weather.clear`. */
export function weatherCodeToLabelKey(wmoCode: number): `weather.${WeatherCondition}` {
  return `weather.${weatherCodeToCondition(wmoCode)}`;
}
