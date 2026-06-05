import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme';
import { PixelAvatar } from '@shared/components/PixelAvatar';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Capsule } from '../api';
import { countdownLabel } from '../utils/openability';

const LOCK_SIZE = 18;

export interface SealedCapsuleAuthor {
  spriteId: string | null;
  color: string | null;
}

export interface SealedCapsuleCardProps {
  capsule: Capsule;
  author?: SealedCapsuleAuthor;
}

/**
 * A locked, non-pressable capsule: lock glyph + "Sealed" label + author avatar
 * and either a tabular day countdown (date-anchored) or a milestone hint. The
 * disabled visual semantics distinguish it from the openable {@link CapsuleReveal}.
 */
export function SealedCapsuleCard({ capsule, author }: SealedCapsuleCardProps) {
  const { t } = useTranslation();
  const isMilestoneAnchored = capsule.open_after == null && capsule.open_at_milestone != null;

  return (
    <PixelCard
      className="mb-3 bg-surface-alt opacity-90"
      accessibilityLabel={t('timeCapsules.sealed')}
    >
      <View className="flex-row items-center gap-3">
        {author?.spriteId ? (
          <PixelAvatar
            spriteId={author.spriteId}
            color={author.color ?? colors.border}
            label={t('timeCapsules.sealed')}
            size="sm"
          />
        ) : null}

        <View className="flex-1 flex-row items-center gap-2">
          <Lock size={LOCK_SIZE} color={colors.textSecondary} />
          <PixelText size="body" family="body-semibold" className="text-text-secondary">
            {t('timeCapsules.sealed')}
          </PixelText>
        </View>

        {isMilestoneAnchored ? (
          <PixelText size="caption" className="text-text-secondary">
            {t('timeCapsules.opensAtMilestone')}
          </PixelText>
        ) : capsule.open_after ? (
          <PixelText
            size="caption"
            family="body-medium"
            className="text-text-secondary"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {t('timeCapsules.opensIn', { days: countdownLabel(capsule.open_after) })}
          </PixelText>
        ) : null}
      </View>
    </PixelCard>
  );
}
