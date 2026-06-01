import { Image, View } from 'react-native';

import { AVATAR_SPRITES } from '@assets/sprites/avatars/manifest';

type AvatarSize = 'sm' | 'md';
const DIM: Record<AvatarSize, number> = { sm: 28, md: 40 };

export interface PixelAvatarProps {
  spriteId: string;
  color?: string;
  label: string;
  size?: AvatarSize;
}

/**
 * A traveler's avatar: pixel sprite in a color-ringed circle. Reused by the
 * live-avatars map layer and presence lists. Falls back to the first sprite
 * if the id is unknown.
 */
export function PixelAvatar({ spriteId, color = '#0F1A2E', label, size = 'md' }: PixelAvatarProps) {
  const sprite = AVATAR_SPRITES.find((s) => s.id === spriteId) ?? AVATAR_SPRITES[0];
  const d = DIM[size];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: 2,
        borderColor: color,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Image
        source={sprite.source}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </View>
  );
}
