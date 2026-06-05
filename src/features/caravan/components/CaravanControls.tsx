import { Flag, Radio, Square } from 'lucide-react-native';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import type { CaravanRole } from '../utils/caravanProtocol';

const ICON_SIZE = 16;
const ICON_ON_DARK = '#FFFFFF';
const ICON_ON_ACCENT = '#A87E00'; // accent-700, readable on accent-500
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export interface CaravanControlsProps {
  role: CaravanRole;
  /** Display name of the leader we (could) follow — for the join/following copy. */
  leaderName?: string | null;
  /** True when there is another member currently leading we can join. */
  canFollow?: boolean;
  onLead: () => void;
  onFollow: () => void;
  onLeave: () => void;
}

/**
 * Map overlay pill cluster for caravan mode (UI spec §8D). Three states, one
 * primary action each, conveyed by color + icon + label (never color alone):
 * - off       → "Lead caravan" (secondary) and, when someone leads, "Join {name}".
 * - leading   → "Leading · Stop" (accent + stop glyph).
 * - following → top banner "Following {name}" (info) + an explicit Break button.
 *
 * Positioning (safe-area clearance) is the caller's responsibility.
 */
export function CaravanControls({
  role,
  leaderName,
  canFollow = false,
  onLead,
  onFollow,
  onLeave,
}: CaravanControlsProps) {
  const { t } = useTranslation();
  const name = leaderName ?? '';

  const lead = () => {
    haptics.selection();
    onLead();
  };
  const follow = () => {
    haptics.selection();
    onFollow();
  };
  const leave = () => {
    haptics.selection();
    onLeave();
  };

  if (role === 'following') {
    return (
      <View className="gap-2">
        <View className="flex-row items-center justify-center rounded-lg border-2 border-border bg-info px-3 py-2">
          <PixelText size="small" family="body-medium" className="text-white">
            {t('caravan.following', { name })}
          </PixelText>
        </View>
        <PixelButton
          variant="secondary"
          size="sm"
          onPress={leave}
          hitSlop={HIT_SLOP}
          accessibilityLabel={t('caravan.break')}
        >
          {t('caravan.break')}
        </PixelButton>
      </View>
    );
  }

  if (role === 'leading') {
    return (
      <PixelButton
        variant="accent"
        size="sm"
        onPress={leave}
        hitSlop={HIT_SLOP}
        leftIcon={<Square size={ICON_SIZE} color={ICON_ON_ACCENT} fill={ICON_ON_ACCENT} />}
        accessibilityLabel={`${t('caravan.leading')} · ${t('caravan.stop')}`}
      >
        {`${t('caravan.leading')} · ${t('caravan.stop')}`}
      </PixelButton>
    );
  }

  // role === 'off'
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      <PixelButton
        variant="secondary"
        size="sm"
        onPress={lead}
        hitSlop={HIT_SLOP}
        leftIcon={<Flag size={ICON_SIZE} color={ICON_ON_DARK} />}
        accessibilityLabel={t('caravan.lead')}
      >
        {t('caravan.lead')}
      </PixelButton>
      {canFollow ? (
        <PixelButton
          variant="primary"
          size="sm"
          onPress={follow}
          hitSlop={HIT_SLOP}
          leftIcon={<Radio size={ICON_SIZE} color={ICON_ON_DARK} />}
          accessibilityLabel={t('caravan.join', { name })}
        >
          {t('caravan.join', { name })}
        </PixelButton>
      ) : null}
    </View>
  );
}
