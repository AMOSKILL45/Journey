import { REACTION_IDS, type ReactionId } from '../data/reactionSet';

export interface ReactionRow {
  emoji: string;
  user_id: string;
}

export interface ReactionTally {
  count: number;
  mine: boolean;
}

export type ReactionTallies = Record<ReactionId, ReactionTally>;

const REACTION_SET = new Set<string>(REACTION_IDS);

function emptyTallies(): ReactionTallies {
  return REACTION_IDS.reduce((acc, id) => {
    acc[id] = { count: 0, mine: false };
    return acc;
  }, {} as ReactionTallies);
}

/**
 * Aggregate raw reaction rows into a per-emoji `{ count, mine }` map keyed by the fixed
 * REACTION_IDS set. Rows with an emoji outside the curated set are ignored. `mine` is true
 * when `currentUserId` has reacted with that emoji.
 */
export function tallyReactions(
  rows: readonly ReactionRow[] | null | undefined,
  currentUserId: string | null | undefined,
): ReactionTallies {
  const tallies = emptyTallies();
  if (!rows) return tallies;
  for (const row of rows) {
    if (!REACTION_SET.has(row.emoji)) continue;
    const id = row.emoji as ReactionId;
    tallies[id].count += 1;
    if (currentUserId != null && row.user_id === currentUserId) {
      tallies[id].mine = true;
    }
  }
  return tallies;
}

/** Total number of valid reactions across all emojis (ignores unknown emojis). */
export function totalReactions(rows: readonly ReactionRow[] | null | undefined): number {
  if (!rows) return 0;
  return rows.reduce((sum, row) => (REACTION_SET.has(row.emoji) ? sum + 1 : sum), 0);
}
