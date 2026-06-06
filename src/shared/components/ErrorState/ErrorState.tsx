import { Image, ImageSourcePropType, View } from 'react-native';

import { t } from '@core/i18n';

import { PixelButton } from '../PixelButton';
import { PixelText } from '../PixelText';

/** Sprite edge length in px (mirrors EmptyState). */
const SPRITE_SIZE = 112;

export interface ErrorStateProps {
  /** Optional pixel-art sprite (e.g. a sad mascot). */
  spriteSource?: ImageSourcePropType;
  /** Accessibility label for the sprite (required when a sprite is given). */
  spriteLabel?: string;
  title: string;
  body: string;
  onRetry: () => void;
  /** Retry button label; defaults to the shared common.retry key. */
  retryLabel?: string;
  testID?: string;
}

/**
 * Error placeholder with a recovery path (UI spec §2): sprite + title + body +
 * Retry. Container is a polite live region so screen readers announce it.
 */
export function ErrorState({
  spriteSource,
  spriteLabel,
  title,
  body,
  onRetry,
  retryLabel,
  testID,
}: ErrorStateProps) {
  const label = retryLabel ?? t('common.retry');
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="flex-1 items-center justify-center gap-3 px-8 py-12"
    >
      {spriteSource ? (
        <Image
          source={spriteSource}
          accessibilityRole="image"
          accessibilityLabel={spriteLabel}
          resizeMode="contain"
          style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }}
        />
      ) : null}
      <PixelText size="h3" className="text-center">
        {title}
      </PixelText>
      <PixelText size="body" className="text-center text-text-secondary">
        {body}
      </PixelText>
      <View className="mt-2">
        <PixelButton variant="secondary" onPress={onRetry} accessibilityLabel={label}>
          {label}
        </PixelButton>
      </View>
    </View>
  );
}
