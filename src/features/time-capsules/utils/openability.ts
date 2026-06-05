const MS_PER_DAY = 86_400_000;

export interface CapsuleOpenState {
  open_after: string | null;
  is_open: boolean;
}

/**
 * Client mirror of the SQL `_capsule_is_open` helper: the server-computed
 * `is_open` flag (which already covers milestone-anchored triggers) wins, else
 * we fall back to comparing the `open_after` timestamp against the local clock
 * so a date-anchored capsule can flip without a round-trip.
 */
export function isCapsuleOpen(c: CapsuleOpenState): boolean {
  if (c.is_open) return true;
  return c.open_after != null && Date.parse(c.open_after) <= Date.now();
}

/**
 * Whole-day countdown magnitude for a sealed, date-anchored capsule, e.g. `'2'`.
 * Returns `'0'` once the date is in the past. The caller wraps this with the
 * `timeCapsules.opensIn` i18n string for pluralization/localization.
 */
export function countdownLabel(openAfter: string): string {
  const days = Math.max(0, Math.ceil((Date.parse(openAfter) - Date.now()) / MS_PER_DAY));
  return `${days}`;
}
