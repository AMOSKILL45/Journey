import { isPollOpen, parseOptions, tally, type PollLike, type VoteLike } from '../pollResults';

const OPTIONS = [
  { id: 'a', label: 'Pizza' },
  { id: 'b', label: 'Sushi' },
  { id: 'c', label: 'Tacos' },
];

function poll(over: Partial<PollLike> = {}): PollLike {
  return { options: OPTIONS, expires_at: null, closed_at: null, ...over };
}

function vote(user_id: string, option_id: string): VoteLike {
  return { user_id, option_id };
}

describe('parseOptions', () => {
  it('returns [] for non-array / malformed input', () => {
    expect(parseOptions(null)).toEqual([]);
    expect(parseOptions('nope')).toEqual([]);
    expect(parseOptions([{ id: 1, label: 'x' }, { label: 'no-id' }, 42])).toEqual([]);
  });

  it('keeps only well-formed {id,label} entries', () => {
    expect(
      parseOptions([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', extra: 1 },
      ]),
    ).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
  });
});

describe('isPollOpen', () => {
  const now = Date.parse('2026-06-05T12:00:00Z');

  it('is open with no expiry and no close', () => {
    expect(isPollOpen({ expires_at: null, closed_at: null }, now)).toBe(true);
  });

  it('is closed when closed_at is set', () => {
    expect(isPollOpen({ expires_at: null, closed_at: '2026-06-05T00:00:00Z' }, now)).toBe(false);
  });

  it('is closed when past expiry, open before expiry', () => {
    expect(isPollOpen({ expires_at: '2026-06-05T11:00:00Z', closed_at: null }, now)).toBe(false);
    expect(isPollOpen({ expires_at: '2026-06-05T13:00:00Z', closed_at: null }, now)).toBe(true);
  });
});

describe('tally', () => {
  it('zero votes → all pct 0, total 0, no winner, no myVote', () => {
    const r = tally(poll(), [], 'me');
    expect(r.total).toBe(0);
    expect(r.winnerId).toBeNull();
    expect(r.myVote).toBeNull();
    expect(r.byOption.map((o) => o.pct)).toEqual([0, 0, 0]);
    expect(r.byOption.map((o) => o.count)).toEqual([0, 0, 0]);
    expect(r.isOpen).toBe(true);
  });

  it('counts votes, rounds percentages, picks strict winner', () => {
    const r = tally(poll(), [vote('u1', 'a'), vote('u2', 'a'), vote('u3', 'b')], 'u3');
    expect(r.total).toBe(3);
    expect(r.winnerId).toBe('a');
    expect(r.myVote).toBe('b');
    const byId = Object.fromEntries(r.byOption.map((o) => [o.id, o]));
    expect(byId.a.count).toBe(2);
    expect(byId.a.pct).toBe(67); // round(2/3*100)
    expect(byId.b.pct).toBe(33);
    expect(byId.c.pct).toBe(0);
  });

  it('a tie yields no winner', () => {
    const r = tally(poll(), [vote('u1', 'a'), vote('u2', 'b')]);
    expect(r.winnerId).toBeNull();
    expect(r.total).toBe(2);
  });

  it('ignores votes for options that no longer exist', () => {
    const r = tally(poll(), [vote('u1', 'ghost'), vote('u2', 'a')], 'u1');
    expect(r.total).toBe(1);
    expect(r.winnerId).toBe('a');
    expect(r.myVote).toBeNull(); // u1 voted for a now-removed option
  });

  it('expired poll is reported closed (isOpen false)', () => {
    const now = Date.parse('2026-06-05T12:00:00Z');
    const r = tally(poll({ expires_at: '2026-06-05T11:00:00Z' }), [vote('u1', 'a')], null, now);
    expect(r.isOpen).toBe(false);
    expect(r.total).toBe(1);
  });

  it('explicitly closed poll is reported closed', () => {
    const r = tally(poll({ closed_at: '2026-06-05T00:00:00Z' }), []);
    expect(r.isOpen).toBe(false);
  });

  it('handles malformed options jsonb without throwing', () => {
    const r = tally({ options: 'oops', expires_at: null, closed_at: null }, [vote('u1', 'a')]);
    expect(r.byOption).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.winnerId).toBeNull();
  });
});
