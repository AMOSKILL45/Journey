/**
 * Pure tally logic for trip polls. No I/O, no React — unit-tested in isolation.
 *
 * A poll's `options` column is freeform JSON; we normalize it to `PollOption[]`
 * defensively (DB is the source of truth but jsonb has no compile-time shape).
 * `tally` computes per-option counts + percentages, the leading option, the
 * caller's own vote, and whether the poll still accepts votes (open).
 */

export interface PollOption {
  id: string;
  label: string;
}

/** Minimal poll shape `tally` needs — a subset of the `polls` row. */
export interface PollLike {
  options: unknown;
  expires_at: string | null;
  closed_at: string | null;
}

/** Minimal vote shape `tally` needs — a subset of the `poll_votes` row. */
export interface VoteLike {
  user_id: string;
  option_id: string;
}

export interface OptionResult {
  id: string;
  label: string;
  count: number;
  /** Whole-number percent of total votes (0 when no votes). */
  pct: number;
}

export interface PollTally {
  byOption: OptionResult[];
  total: number;
  /** Option id with the strict-most votes, or null on zero votes / a tie. */
  winnerId: string | null;
  /** The given user's selected option id, or null if they have not voted. */
  myVote: string | null;
  /** True when the poll still accepts votes (not closed, not past expiry). */
  isOpen: boolean;
}

const PERCENT = 100;

/** Coerce the freeform `options` jsonb into a typed, validated option list. */
export function parseOptions(raw: unknown): PollOption[] {
  if (!Array.isArray(raw)) return [];
  const out: PollOption[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === 'object') {
      const id = (entry as Record<string, unknown>).id;
      const label = (entry as Record<string, unknown>).label;
      if (typeof id === 'string' && typeof label === 'string') {
        out.push({ id, label });
      }
    }
  }
  return out;
}

/** Whether a poll accepts votes at `nowMs` (default: real clock). */
export function isPollOpen(
  poll: Pick<PollLike, 'expires_at' | 'closed_at'>,
  nowMs = Date.now(),
): boolean {
  if (poll.closed_at) return false;
  if (poll.expires_at && new Date(poll.expires_at).getTime() <= nowMs) return false;
  return true;
}

export function tally(
  poll: PollLike,
  votes: VoteLike[],
  myUserId?: string | null,
  nowMs = Date.now(),
): PollTally {
  const options = parseOptions(poll.options);
  const counts = new Map<string, number>();
  for (const o of options) counts.set(o.id, 0);

  let total = 0;
  let myVote: string | null = null;
  for (const v of votes) {
    // Ignore votes for options that no longer exist on the poll.
    if (!counts.has(v.option_id)) continue;
    counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
    total += 1;
    if (myUserId && v.user_id === myUserId) myVote = v.option_id;
  }

  const byOption: OptionResult[] = options.map((o) => {
    const count = counts.get(o.id) ?? 0;
    return {
      id: o.id,
      label: o.label,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * PERCENT),
    };
  });

  // Winner = strict maximum. A tie (>=2 options share the top count) yields null.
  let winnerId: string | null = null;
  let topCount = 0;
  let tied = false;
  for (const r of byOption) {
    if (r.count > topCount) {
      topCount = r.count;
      winnerId = r.id;
      tied = false;
    } else if (r.count === topCount && topCount > 0) {
      tied = true;
    }
  }
  if (tied || topCount === 0) winnerId = null;

  return { byOption, total, winnerId, myVote, isOpen: isPollOpen(poll, nowMs) };
}
