import { groupByCountry, parseStamps, sortByDateDesc } from '../passport';

const raw = [
  { milestone_id: 'm1', trip_id: 't1', label: 'A', country: 'JP', at: '2026-01-01T00:00:00Z' },
  { milestone_id: 'm2', trip_id: 't1', label: 'B', country: 'JP', at: '2026-03-01T00:00:00Z' },
  { bogus: true },
  null,
];

describe('passport', () => {
  it('parses + coerces, dropping malformed rows', () => {
    const out = parseStamps(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ milestone_id: 'm1', country: 'JP' });
  });
  it('parseStamps returns [] for non-array', () => {
    expect(parseStamps(null)).toEqual([]);
    expect(parseStamps({})).toEqual([]);
  });
  it('sorts by date descending', () => {
    expect(sortByDateDesc(parseStamps(raw)).map((s) => s.milestone_id)).toEqual(['m2', 'm1']);
  });
  it('groups by country', () => {
    expect(Object.keys(groupByCountry(parseStamps(raw)))).toEqual(['JP']);
  });
});
