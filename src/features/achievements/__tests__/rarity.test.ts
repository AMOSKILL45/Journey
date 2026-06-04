import { isCinematicRarity, rarityRank, RARITY_FRAME } from '../rarity';

describe('rarity', () => {
  it('treats rare/epic/legendary as cinematic, common + unknown as not', () => {
    expect(isCinematicRarity('rare')).toBe(true);
    expect(isCinematicRarity('epic')).toBe(true);
    expect(isCinematicRarity('legendary')).toBe(true);
    expect(isCinematicRarity('common')).toBe(false);
    expect(isCinematicRarity('mythic')).toBe(false);
  });
  it('ranks rarities ascending and clamps unknown to 0', () => {
    expect(rarityRank('common')).toBe(0);
    expect(rarityRank('legendary')).toBe(3);
    expect(rarityRank('nope')).toBe(0);
  });
  it('has a frame class for every rarity', () => {
    (['common', 'rare', 'epic', 'legendary'] as const).forEach((r) =>
      expect(typeof RARITY_FRAME[r]).toBe('string'),
    );
  });
});
