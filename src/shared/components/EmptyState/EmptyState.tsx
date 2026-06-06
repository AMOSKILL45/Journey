import { Image, ImageSourcePropType, View } from 'react-native';

import { PixelButton } from '../PixelButton';
import { PixelText } from '../PixelText';

/** Sprite edge length in px (UI spec §2: 96–128). */
const SPRITE_SIZE = 112;

export interface EmptyStateProps {
  /** Optional pixel-art sprite shown above the copy. */
  spriteSource?: ImageSourcePropType;
  /** Accessibility label for the sprite (required when a sprite is given). */
  spriteLabel?: string;
  title: string;
  body: string;
  /** Optional single primary action. Rendered only when both label + handler are present. */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/**
 * Centered empty-state placeholder (UI spec §2 / design §3): sprite + title +
 * secondary body + at most ONE primary action. No second CTA by design.
 */
export function EmptyState({
  spriteSource,
  spriteLabel,
  title,
  body,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const showAction = Boolean(actionLabel && onAction);
  return (
    <View testID={testID} className="flex-1 items-center justify-center gap-3 px-8 py-12">
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
      {showAction ? (
        <View className="mt-2">
          <PixelButton onPress={onAction} accessibilityLabel={actionLabel}>
            {actionLabel}
          </PixelButton>
        </View>
      ) : null}
    </View>
  );
}
