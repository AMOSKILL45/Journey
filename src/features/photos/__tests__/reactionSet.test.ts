import { REACTION_GLYPH, REACTION_IDS, reactionAssets } from '../data/reactionSet';

describe('reactionSet', () => {
  it('has exactly six reaction ids, all non-empty strings', () => {
    expect(REACTION_IDS).toHaveLength(6);
    for (const id of REACTION_IDS) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('matches the documented fixed set', () => {
    expect([...REACTION_IDS]).toEqual(['heart', 'fire', 'laugh', 'wow', 'clap', 'star']);
  });

  it('has a glyph fallback for every id', () => {
    for (const id of REACTION_IDS) {
      expect(typeof REACTION_GLYPH[id]).toBe('string');
      expect(REACTION_GLYPH[id].length).toBeGreaterThan(0);
    }
  });

  it('ships an empty asset map until pixel art lands', () => {
    expect(reactionAssets).toEqual({});
  });
});
