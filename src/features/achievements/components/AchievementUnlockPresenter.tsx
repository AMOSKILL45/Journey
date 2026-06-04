import { useAchievementUnlocks } from '../hooks/useAchievementUnlocks';
import { useAchievementDefinitions } from '../hooks/useAchievements';
import { isCinematicRarity } from '../rarity';

import { AchievementToast } from './AchievementToast';
import { WorldClearCinematic } from './WorldClearCinematic';

export function AchievementUnlockPresenter({ userId }: { userId: string | null }) {
  const { current, dequeue } = useAchievementUnlocks(userId);
  const { data: defs = [] } = useAchievementDefinitions();
  if (!current) return null;
  const def = defs.find((d) => d.id === current.id);
  if (isCinematicRarity(current.rarity)) {
    return (
      <WorldClearCinematic
        id={current.id}
        nameKey={def?.name_key ?? ''}
        descriptionKey={def?.description_key ?? ''}
        rarity={current.rarity}
        onDone={dequeue}
      />
    );
  }
  return <AchievementToast name={def?.name_key ?? ''} onDone={dequeue} />;
}
