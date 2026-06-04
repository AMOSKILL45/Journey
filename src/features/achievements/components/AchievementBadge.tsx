import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { RARITY_FRAME } from '../rarity';
import type { AchievementWithStatus, Rarity } from '../types';

export function AchievementBadge({ def }: { def: AchievementWithStatus }) {
  const { t } = useTranslation();
  const name = t(def.name_key);
  const frame = RARITY_FRAME[def.rarity as Rarity] ?? RARITY_FRAME.common;
  return (
    <View
      testID={`badge-${def.id}-${def.unlocked ? 'unlocked' : 'locked'}`}
      className={`w-24 items-center ${def.unlocked ? '' : 'opacity-40'}`}
    >
      <View className={`h-16 w-16 items-center justify-center rounded-lg border-2 ${frame}`}>
        <PixelText size="h2">{def.unlocked ? name.slice(0, 1).toUpperCase() : '?'}</PixelText>
      </View>
      <PixelText size="caption" className="mt-1 text-center" numberOfLines={2}>
        {name}
      </PixelText>
    </View>
  );
}
