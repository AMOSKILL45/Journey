import { filterUnseen } from '../seenSet';

describe('filterUnseen', () => {
  it('keeps only ids not in the seen set', () => {
    expect(filterUnseen(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
    expect(filterUnseen(['a'], new Set(['a']))).toEqual([]);
  });
});
