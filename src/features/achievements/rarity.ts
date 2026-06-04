import type { Rarity } from './types';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'] as const;
const CINEMATIC = new Set<string>(['rare', 'epic', 'legendary']);

export function isCinematicRarity(rarity: string): boolean {
  return CINEMATIC.has(rarity);
}
export function rarityRank(rarity: string): number {
  const i = RARITIES.indexOf(rarity as Rarity);
  return i < 0 ? 0 : i;
}
export const RARITY_FRAME: Record<Rarity, string> = {
  common: 'border-border bg-surface-alt',
  rare: 'border-sky-700 bg-sky-500',
  epic: 'border-secondary-700 bg-secondary-500',
  legendary: 'border-accent-700 bg-accent-500',
};
