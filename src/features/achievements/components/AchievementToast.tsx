import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { playUnlockSfx } from '../sound';

const DEFAULT_DURATION_MS = 1200;
const ENTER_MS = 220;
const SLIDE_FROM = 24;

export interface AchievementToastProps {
  /** i18n key for the achievement name (translated in this leaf component). */
  name: string;
  onDone: () => void;
  durationMs?: number;
}

/**
 * Bottom-pinned unlock toast for `common` achievements. Fades + slides in,
 * then auto-dismisses after {@link AchievementToastProps.durationMs}
 * (injectable so tests can fast-forward). Rarer unlocks use the cinematic.
 */
export function AchievementToast({
  name,
  onDone,
  durationMs = DEFAULT_DURATION_MS,
}: AchievementToastProps) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const label = name ? t(name) : '';

  useEffect(() => {
    playUnlockSfx('common');
    progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDone, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * SLIDE_FROM }],
  }));

  return (
    <Animated.View
      testID="achievement-toast"
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={`${t('achievements.toast.unlocked')} ${label}`.trim()}
      style={[styles.wrap, animatedStyle]}
    >
      <PixelCard variant="elevated" className="flex-row items-center">
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-lg border-2 border-accent-700 bg-accent-500"
          importantForAccessibility="no"
        >
          <PixelText size="h3" importantForAccessibility="no">
            {label ? label.slice(0, 1).toUpperCase() : '?'}
          </PixelText>
        </View>
        <View className="flex-1" importantForAccessibility="no">
          <PixelText size="caption" className="text-text-secondary">
            {t('achievements.toast.unlocked')}
          </PixelText>
          <PixelText size="body" family="body-semibold" numberOfLines={1}>
            {label}
          </PixelText>
        </View>
      </PixelCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
  },
});
