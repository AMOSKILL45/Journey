import { useCallback, useState } from 'react';

/** Minimal milestone shape the boss cutscene needs from a check-in success path. */
export interface BossCheckinMilestone {
  id: string;
  name: string;
  is_boss?: boolean | null;
}

/** The currently-queued boss reveal (only id + display name are needed by the cinematic). */
export interface ActiveBossCutscene {
  id: string;
  name: string;
}

export interface UseBossCutscene {
  active: ActiveBossCutscene | null;
  onCheckin: (milestone: BossCheckinMilestone) => void;
  dismiss: () => void;
}

/**
 * Queues a boss-clear cutscene. {@link UseBossCutscene.onCheckin} is fed from the
 * existing check-in success path and only activates when the checked-in milestone
 * is a boss (`is_boss === true`); non-boss and undefined-flag check-ins are ignored.
 * {@link UseBossCutscene.dismiss} clears the active reveal (called by the presenter
 * once the cinematic finishes).
 */
export function useBossCutscene(): UseBossCutscene {
  const [active, setActive] = useState<ActiveBossCutscene | null>(null);

  const onCheckin = useCallback((milestone: BossCheckinMilestone) => {
    if (!milestone.is_boss) return;
    setActive({ id: milestone.id, name: milestone.name });
  }, []);

  const dismiss = useCallback(() => setActive(null), []);

  return { active, onCheckin, dismiss };
}
