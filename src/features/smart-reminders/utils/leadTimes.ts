const MS_PER_DAY = 86_400_000;

/** Whole days from `from` to `to` (both 'YYYY-MM-DD', UTC). Positive if `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * The single lead time to fire this run: the largest unfired lead time L with daysUntil <= L.
 * Largest-first stepping means at most one push per run and no spam when the cron fell behind.
 */
export function nextDueLeadTime(
  daysUntil: number,
  leadTimes: number[],
  fired: number[],
): number | null {
  const due = leadTimes.filter((l) => daysUntil <= l && !fired.includes(l));
  return due.length ? Math.max(...due) : null;
}
