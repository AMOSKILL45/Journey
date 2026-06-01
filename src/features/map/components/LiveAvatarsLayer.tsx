import { View } from 'react-native';

import { PixelAvatar } from '@shared/components/PixelAvatar';

/** Structurally compatible with realtime's PresenceMember; kept local so map has no realtime dep. */
export interface LiveMember {
  user_id: string;
  avatar_sprite_id: string;
  avatar_color: string;
  current_milestone_id: string | null;
  display_name?: string | null;
  liveLat?: number | null; // 5B: fresh GPS overrides the milestone anchor
  liveLng?: number | null;
}

export interface AvatarPlacement {
  member: LiveMember;
  x: number;
  y: number;
}

export interface LiveAvatarsLayerProps {
  placements: readonly AvatarPlacement[];
}

const AVATAR = 28;
const FAN_X = 18; // fan travelers that share a spot
const ABOVE_NODE = 36; // sit avatars above the node circle

/**
 * Renders each present traveler's avatar at a screen position computed by the
 * layer that owns the camera (OverworldLayer) — so avatars stay glued to their
 * node (or live GPS point). Co-located avatars fan out. Pointer-transparent.
 */
export function LiveAvatarsLayer({ placements }: LiveAvatarsLayerProps) {
  const groups = new Map<string, AvatarPlacement[]>();
  for (const p of placements) {
    const k = `${Math.round(p.x)},${Math.round(p.y)}`;
    const arr = groups.get(k) ?? [];
    arr.push(p);
    groups.set(k, arr);
  }

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {[...groups.values()].flatMap((group) =>
        group.map((pl, i) => (
          <View
            key={pl.member.user_id}
            style={{
              position: 'absolute',
              left: pl.x - AVATAR / 2 + i * FAN_X,
              top: pl.y - AVATAR / 2 - ABOVE_NODE,
            }}
          >
            <PixelAvatar
              spriteId={pl.member.avatar_sprite_id}
              color={pl.member.avatar_color}
              label={pl.member.display_name ?? 'Traveler'}
              size="sm"
            />
          </View>
        )),
      )}
    </View>
  );
}
