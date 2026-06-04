import { haptics, playSfx } from '@features/feedback';

// 6C: achievement unlock = fanfare SFX + success haptic (both settings-gated).
export function playUnlockSfx(_rarity: string): void {
  playSfx('achievement_fanfare');
  haptics.success();
}
