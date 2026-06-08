import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@core/theme/tokens';

import { PixelText } from '../PixelText';

/** Number of placeholder rows the skeleton reserves. */
const SKELETON_ROWS = 4;
/** Skeleton row geometry (reserves TripCard-sized space → no layout shift / CLS). */
const SKELETON_ROW_HEIGHT = 64;
/** Slow breathing shimmer — reads as "loading", not the static cream-on-cream boxes that read "broken". */
const PULSE_MIN = 0.55;
const PULSE_MAX = 1;
const PULSE_MS = 750;

/** Subtle dark bar hinting at a title/subtitle line inside the skeleton card. */
function barStyle(alpha: number, width: `${number}%`, height: number) {
  return { height, width, borderRadius: 4, backgroundColor: `rgba(15, 26, 46, ${alpha})` } as const;
}

type LoadingVariant = 'spinner' | 'skeleton';

export interface LoadingStateProps {
  variant?: LoadingVariant;
  /** Visible + announced loading label (e.g. t('common.loading')). */
  label?: string;
  testID?: string;
}

function SkeletonRows({ label, testID }: { label?: string; testID?: string }) {
  const pulse = useSharedValue(PULSE_MIN);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(PULSE_MAX, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const shimmer = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="gap-3 px-4 py-4"
    >
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <Animated.View
          key={i}
          style={[{ height: SKELETON_ROW_HEIGHT }, shimmer]}
          className="flex-row items-center gap-3 rounded-lg border-pixel border-border bg-surface-alt px-3"
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {/* Leading world-theme / sprite chip + two text lines = a TripCard silhouette. */}
          <View
            style={{
              height: 40,
              width: 40,
              borderRadius: 8,
              backgroundColor: 'rgba(15, 26, 46, 0.14)',
            }}
          />
          <View className="flex-1 gap-2">
            <View style={barStyle(0.16, '55%', 12)} />
            <View style={barStyle(0.1, '35%', 10)} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * Loading affordance for waits >300ms (UI spec §2). `skeleton` reserves list-row
 * space to avoid layout shift; `spinner` is a styled ActivityIndicator. Always
 * announces a loading label to screen readers.
 */
export function LoadingState({ variant = 'spinner', label, testID }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return <SkeletonRows label={label} testID={testID} />;
  }
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="flex-1 items-center justify-center gap-3 py-12"
    >
      <ActivityIndicator color={colors.primary[600]} />
      {label ? (
        <PixelText size="body" className="text-text-secondary">
          {label}
        </PixelText>
      ) : null}
    </View>
  );
}
