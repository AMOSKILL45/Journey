import { ActivityIndicator, View } from 'react-native';

import { colors } from '@core/theme/tokens';

import { PixelText } from '../PixelText';

/** Number of placeholder rows the skeleton reserves. */
const SKELETON_ROWS = 4;
/** Skeleton row geometry (reserves list-row space → no layout shift / CLS). */
const SKELETON_ROW_HEIGHT = 56;

type LoadingVariant = 'spinner' | 'skeleton';

export interface LoadingStateProps {
  variant?: LoadingVariant;
  /** Visible + announced loading label (e.g. t('common.loading')). */
  label?: string;
  testID?: string;
}

function SkeletonRows({ label, testID }: { label?: string; testID?: string }) {
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="gap-3 px-4 py-4"
    >
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <View
          key={i}
          style={{ height: SKELETON_ROW_HEIGHT }}
          className="rounded-md border-pixel border-border bg-surface-alt opacity-60"
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
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
