// 7C — Distance + Weather enrichment.
// Weather + driving legs are computed server-side by the `enrich_milestone` edge function
// (Open-Meteo + OSRM, service role) and cached in `weather_cache` / `milestone_legs`. The client
// only reads the caches and triggers a refresh; it never calls the external APIs directly.

export {
  triggerEnrich,
  getMilestoneWeather,
  getTripLegs,
  type WeatherCacheRow,
  type MilestoneLegRow,
  type WeatherPayload,
  type MilestoneWeather,
} from './api';

export {
  useMilestoneWeather,
  milestoneWeatherQueryKey,
  type UseMilestoneWeatherOptions,
} from './hooks/useMilestoneWeather';
export {
  useTripDistances,
  tripLegsQueryKey,
  legKey,
  type UseTripDistancesOptions,
} from './hooks/useTripDistances';

export { WeatherBadge, type WeatherBadgeProps } from './components/WeatherBadge';
export { DistancePill, type DistancePillProps } from './components/DistancePill';

export {
  WEATHER_CONDITIONS,
  weatherCodeToCondition,
  weatherCodeToIcon,
  weatherCodeToLabelKey,
  type WeatherCondition,
} from './utils/weather';
export {
  formatDistance,
  formatDuration,
  DISTANCE_CONSTANTS,
  type DistanceUnit,
} from './utils/distance';
