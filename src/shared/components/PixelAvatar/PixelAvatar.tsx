import { Avatar } from '@dicebear/core';
import pixelArt from '@dicebear/styles/pixel-art.json';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

type AvatarSize = 'sm' | 'md';
const DIM: Record<AvatarSize, number> = { sm: 28, md: 40 };

export interface PixelAvatarProps {
  /** Stable per-traveler seed (the chosen `avatar_sprite_id`) — drives a deterministic avatar. */
  spriteId: string;
  /** Ring color (the traveler's `avatar_color`). */
  color?: string;
  /** A11y label. Omit to render decoratively inside an already-labeled control (e.g. the picker). */
  label?: string;
  size?: AvatarSize;
}

/**
 * A traveler's avatar: a DiceBear "pixel-art" character (open-source, CC0) generated
 * deterministically from `spriteId`, rendered as a local SVG (no network, no asset
 * commission) inside a color-ringed circle. Reused by the live-avatars map layer,
 * presence lists and profiles. Swap the imported style (e.g. `adventurer.json`) to
 * change the look in one line.
 */
export function PixelAvatar({ spriteId, color = '#0F1A2E', label, size = 'md' }: PixelAvatarProps) {
  const d = DIM[size];
  const svg = useMemo(() => new Avatar(pixelArt, { seed: spriteId }).toString(), [spriteId]);

  return (
    <View
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? undefined : 'no-hide-descendants'}
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
      <SvgXml xml={svg} width={d} height={d} />
    </View>
  );
}
