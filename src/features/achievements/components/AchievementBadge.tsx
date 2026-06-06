import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { RARITY_FRAME } from '../rarity';
import type { AchievementWithStatus, Rarity } from '../types';

export function AchievementBadge({ def }: { def: AchievementWithStatus }) {
  const { t } = useTranslation();
  const name = t(def.name_key);
  const frame = RARITY_FRAME[def.rarity as Rarity] ?? RARITY_FRAME.common;
  // One screen-reader element per badge: announce the name + lock state instead of
  // the decorative single-letter / "?" glyph (which is meaningless to a SR).
  const a11yLabel = def.unlocked ? name : `${name}, ${t('achievements.locked')}`;
  return (
    <View
      testID={`badge-${def.id}-${def.unlocked ? 'unlocked' : 'locked'}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      className={`w-24 items-center ${def.unlocked ? '' : 'opacity-40'}`}
    >
      <View
        className={`h-16 w-16 items-center justify-center rounded-lg border-2 ${frame}`}
        importantForAccessibility="no"
      >
        <PixelText size="h2" importantForAccessibility="no">
          {def.unlocked ? name.slice(0, 1).toUpperCase() : '?'}
        </PixelText>
      </View>
      <PixelText
        size="caption"
        className="mt-1 text-center"
        numberOfLines={2}
        importantForAccessibility="no"
      >
        {name}
      </PixelText>
    </View>
  );
}
