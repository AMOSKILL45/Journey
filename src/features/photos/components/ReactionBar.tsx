import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

import type { ReactionTargetType } from '../api';
import { REACTION_GLYPH, REACTION_IDS, reactionAssets, type ReactionId } from '../data/reactionSet';
import { usePhotoReactions } from '../hooks/usePhotoReactions';
import { tallyReactions } from '../utils/reactions';

export interface ReactionBarProps {
  targetType: ReactionTargetType;
  targetId: string;
  currentUserId: string | null;
  /** Compact mode hides zero-count chips and the heading (e.g. on a milestone node). */
  compact?: boolean;
}

/**
 * Six fixed pixel-emoji reaction buttons with live counts. Pressing toggles the current user's
 * reaction (optimistic) and fires the gated selection haptic from 6C. Works on any reaction
 * target (`photo` | `milestone` | `checkin`).
 */
export function ReactionBar({
  targetType,
  targetId,
  currentUserId,
  compact = false,
}: ReactionBarProps) {
  const { t } = useTranslation();
  const { data: rows, toggle } = usePhotoReactions(targetType, targetId, currentUserId);
  const tallies = tallyReactions(rows, currentUserId);

  const onPress = (emoji: ReactionId) => {
    haptics.selection();
    toggle.mutate(emoji);
  };

  return (
    <View
      accessibilityLabel={t('reactions.barLabel')}
      className={cn('flex-row flex-wrap', compact ? 'gap-1' : 'gap-2')}
    >
      {REACTION_IDS.map((emoji) => {
        const tally = tallies[emoji];
        if (compact && tally.count === 0) return null;
        const hasSprite = reactionAssets[emoji] != null;
        return (
          <Pressable
            key={emoji}
            testID={`reaction-${emoji}`}
            onPress={() => onPress(emoji)}
            accessibilityRole="button"
            accessibilityState={{ selected: tally.mine }}
            accessibilityLabel={t('reactions.toggle', {
              emoji: t(`reactions.label.${emoji}`),
              count: tally.count,
            })}
            hitSlop={6}
            className={cn(
              'flex-row items-center gap-1 rounded border-pixel border-border px-2 py-1',
              tally.mine ? 'bg-accent-500' : 'bg-surface-alt',
            )}
          >
            {/* Sprite art is an asset task; until then show the unicode glyph fallback. */}
            <PixelText size="body" accessibilityElementsHidden>
              {hasSprite ? '' : REACTION_GLYPH[emoji]}
            </PixelText>
            {tally.count > 0 ? (
              <PixelText
                size="caption"
                family="body-bold"
                className={tally.mine ? 'text-accent-700' : 'text-text-secondary'}
              >
                {tally.count}
              </PixelText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
