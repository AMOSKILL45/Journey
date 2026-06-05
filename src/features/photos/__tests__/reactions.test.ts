import { tallyReactions, totalReactions, type ReactionRow } from '../utils/reactions';

function row(emoji: string, user_id: string): ReactionRow {
  return { emoji, user_id };
}

describe('tallyReactions', () => {
  it('returns a zeroed tally for every emoji when there are no rows', () => {
    const tally = tallyReactions([], 'me');
    expect(Object.keys(tally).sort()).toEqual(
      ['clap', 'fire', 'heart', 'laugh', 'star', 'wow'].sort(),
    );
    for (const key of Object.keys(tally)) {
      expect(tally[key as keyof typeof tally]).toEqual({ count: 0, mine: false });
    }
  });

  it('handles null/undefined rows', () => {
    expect(tallyReactions(null, 'me').heart).toEqual({ count: 0, mine: false });
    expect(tallyReactions(undefined, 'me').heart).toEqual({ count: 0, mine: false });
  });

  it('counts reactions from multiple users', () => {
    const rows = [row('heart', 'a'), row('heart', 'b'), row('fire', 'c')];
    const tally = tallyReactions(rows, 'z');
    expect(tally.heart.count).toBe(2);
    expect(tally.fire.count).toBe(1);
    expect(tally.wow.count).toBe(0);
  });

  it('flags mine=true only for the current user', () => {
    const rows = [row('star', 'me'), row('star', 'other')];
    const tally = tallyReactions(rows, 'me');
    expect(tally.star.count).toBe(2);
    expect(tally.star.mine).toBe(true);

    const tallyOther = tallyReactions(rows, 'someone-else');
    expect(tallyOther.star.mine).toBe(false);
  });

  it('does not flag mine when currentUserId is null', () => {
    const tally = tallyReactions([row('clap', 'a')], null);
    expect(tally.clap.mine).toBe(false);
  });

  it('ignores emojis outside the fixed set', () => {
    const rows = [row('heart', 'a'), row('rocket', 'b'), row('💀', 'c')];
    const tally = tallyReactions(rows, 'a');
    expect(tally.heart.count).toBe(1);
    expect(Object.values(tally).reduce((s, t) => s + t.count, 0)).toBe(1);
  });
});

describe('totalReactions', () => {
  it('sums only valid emojis', () => {
    expect(totalReactions([row('heart', 'a'), row('nope', 'b'), row('fire', 'c')])).toBe(2);
    expect(totalReactions(null)).toBe(0);
  });
});
