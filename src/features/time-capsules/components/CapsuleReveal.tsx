import { Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme';
import { haptics, playSfx, useFeedbackSettings } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Capsule } from '../api';

const ENTER_MS = 420;
const EXIT_MS = 220;
const SEAL_SCALE = 0.92;
const SPARKLE_SIZE = 18;

export interface CapsuleRevealProps {
  capsule: Capsule;
  /** Returns the decrypted message (server re-checks gates + stamps opened_at). */
  onOpen: (capsuleId: string) => Promise<string>;
  /** Pre-revealed text (e.g. an already-opened capsule); skips the fetch. */
  initialMessage?: string | null;
}

/**
 * An openable capsule: accent-glowing card + Open CTA. Tapping unwraps with a
 * scale + crossfade to the message, plays `capsule_open` + a medium haptic.
 * Honours the feedback Reduce Motion flag (instant crossfade, no animation).
 */
export function CapsuleReveal({ capsule, onOpen, initialMessage }: CapsuleRevealProps) {
  const { t } = useTranslation();
  const reduceMotion = useFeedbackSettings((s) => s.osReduceMotion);

  const [message, setMessage] = useState<string | null>(initialMessage ?? capsule.message ?? null);
  const [revealed, setRevealed] = useState<boolean>(Boolean(initialMessage ?? capsule.message));
  const [loading, setLoading] = useState(false);

  const progress = useSharedValue(revealed ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: SEAL_SCALE + (1 - SEAL_SCALE) * progress.value }],
  }));

  const handleOpen = useCallback(async () => {
    if (loading || revealed) return;
    setLoading(true);
    try {
      const text = message ?? (await onOpen(capsule.id));
      setMessage(text);
      playSfx('capsule_open');
      haptics.medium();
      if (reduceMotion) {
        progress.value = 1;
      } else {
        progress.value = 0;
        progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
      }
      setRevealed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, revealed, message, onOpen, capsule.id, reduceMotion, progress]);

  if (!revealed) {
    return (
      <PixelCard
        className="mb-3 border-accent-500 bg-surface-alt"
        accessibilityLabel={t('timeCapsules.open')}
      >
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Sparkles size={SPARKLE_SIZE} color={colors.accent[700]} />
            <PixelText size="body" family="body-semibold" className="flex-1 text-text-primary">
              {t('timeCapsules.notif.title')}
            </PixelText>
          </View>
          <PixelButton variant="primary" onPress={handleOpen} loading={loading} fullWidth>
            {t('timeCapsules.open')}
          </PixelButton>
        </View>
      </PixelCard>
    );
  }

  // Exit faster than enter: not animated here (mount-stable), but the timing
  // constant documents the asymmetry used when the reveal is dismissed upstream.
  void EXIT_MS;

  return (
    <Animated.View style={reduceMotion ? undefined : animatedStyle}>
      <PixelCard className="mb-3 border-accent-500 bg-cream" accessibilityLabel={message ?? ''}>
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Sparkles size={SPARKLE_SIZE} color={colors.accent[700]} />
            <PixelText size="small" family="body-medium" className="text-accent-700">
              {t('timeCapsules.notif.title')}
            </PixelText>
          </View>
          <PixelText size="body" className="text-text-primary">
            {message}
          </PixelText>
        </View>
      </PixelCard>
    </Animated.View>
  );
}
