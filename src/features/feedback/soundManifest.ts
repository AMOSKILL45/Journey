export const SOUND_IDS = [
  'coin_unlock',
  'achievement_fanfare',
  'milestone_powerup',
  'button_blip',
  'toggle_click',
  'boss_cleared',
  'capsule_open',
  'encounter',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

export const SOUND_CATEGORY: Record<SoundId, 'ui' | 'event'> = {
  coin_unlock: 'event',
  achievement_fanfare: 'event',
  milestone_powerup: 'event',
  button_blip: 'ui',
  toggle_click: 'ui',
  boss_cleared: 'event',
  capsule_open: 'event',
  encounter: 'event',
};

// require() entries are added here when real CC0 files land in src/assets/sounds/.
// Empty until then so Metro never bundles a missing asset; playSfx() no-ops on absent ids.
export const soundAssets: Partial<Record<SoundId, number>> = {};
