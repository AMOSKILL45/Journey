/** One labelled stat drawn on the scrapbook card: a formatted value over a label. */
export interface CardStat {
  /** Stable key for React lists. */
  key: string;
  /** Human-facing label (already translated by the caller). */
  label: string;
  /** Pre-formatted value string (e.g. "1,234 km", "5"). */
  value: string;
}

/** Metres in one kilometre. */
const M_PER_KM = 1000;
/** Below this distance we show metres; at/above we show whole kilometres. */
const KM_THRESHOLD_M = 1000;

/**
 * Format a raw distance in metres for the card: under 1 km shows metres ("850 m"),
 * otherwise whole kilometres with a thousands separator ("1,234 km"). Locale-agnostic
 * grouping (comma) keeps the rendered PNG identical across devices.
 */
export function formatCardDistance(distanceM: number): string {
  const safe = Number.isFinite(distanceM) && distanceM > 0 ? distanceM : 0;
  if (safe < KM_THRESHOLD_M) return `${Math.round(safe)} m`;
  const km = Math.round(safe / M_PER_KM);
  return `${groupThousands(km)} km`;
}

/** Insert commas as thousands separators (e.g. 1234 -> "1,234"). */
function groupThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Build one {@link CardStat}. `distance` keys are run through {@link formatCardDistance};
 * everything else is rendered as its integer value.
 */
export function formatStatLine(key: string, label: string, value: number): CardStat {
  const formatted =
    key === 'distance' ? formatCardDistance(value) : `${Math.max(0, Math.round(value))}`;
  return { key, label, value: formatted };
}
