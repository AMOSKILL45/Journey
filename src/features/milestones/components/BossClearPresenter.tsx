import type { UseBossCutscene } from '../hooks/useBossCutscene';

import { BossClearCinematic } from './BossClearCinematic';

export interface BossClearPresenterProps {
  /** The live {@link UseBossCutscene} value; owned by the screen so it can feed `onCheckin`. */
  cutscene: UseBossCutscene;
}

/**
 * Renders the boss-clear cinematic for the currently-queued boss check-in, or
 * nothing when idle. The screen owns the {@link UseBossCutscene} instance (so it
 * can call `onCheckin` from its check-in success path) and passes it here; the
 * cinematic's `onDone` clears it via `dismiss`.
 */
export function BossClearPresenter({ cutscene }: BossClearPresenterProps) {
  const { active, dismiss } = cutscene;
  if (!active) return null;
  return <BossClearCinematic milestoneName={active.name} onDone={dismiss} />;
}
