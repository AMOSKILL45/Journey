export const QUIET_START = 22;
export const QUIET_END = 8;

/** True if the given local hour (0–23) falls in the 22:00–08:00 quiet window. */
export function isWithinQuietHours(
  localHour: number,
  start = QUIET_START,
  end = QUIET_END,
): boolean {
  return localHour >= start || localHour < end;
}
