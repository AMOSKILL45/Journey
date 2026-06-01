import { View } from 'react-native';

import { PixelAvatar } from '@shared/components/PixelAvatar';

import type { ProjectedPoint } from '../utils/projectMilestones';

/** Structurally compatible with realtime's PresenceMember; kept local so map has no realtime dep. */
export interface LiveMember {
  user_id: string;
  avatar_sprite_id: string;
  avatar_color: string;
  current_milestone_id: string | null;
  display_name?: string | null;
}

export interface LiveAvatarsLayerProps {
  members: readonly LiveMember[];
  positions: readonly ProjectedPoint[];
}

const AVATAR = 28;
const FAN_X = 18; // horizontal offset when several travelers share a milestone
const ABOVE_NODE = 36; // sit avatars above the node circle

/**
 * Renders each present traveler's avatar above the milestone they've reached.
 * Travelers at the same milestone fan out horizontally. Pointer-transparent so
 * it never blocks node taps. No projection here — positions come from the layer
 * that owns the camera (OverworldLayer), so avatars stay glued to their node.
 */
export function LiveAvatarsLayer({ members, positions }: LiveAvatarsLayerProps) {
  const posById = new Map(positions.map((p) => [p.id, p]));
  const byMilestone = new Map<string, LiveMember[]>();
  for (const m of members) {
    if (!m.current_milestone_id || !posById.has(m.current_milestone_id)) continue;
    const arr = byMilestone.get(m.current_milestone_id) ?? [];
    arr.push(m);
    byMilestone.set(m.current_milestone_id, arr);
  }

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {[...byMilestone.entries()].flatMap(([milestoneId, group]) => {
        const pos = posById.get(milestoneId);
        if (!pos) return [];
        return group.map((m, i) => (
          <View
            key={m.user_id}
            style={{
              position: 'absolute',
              left: pos.x - AVATAR / 2 + i * FAN_X,
              top: pos.y - AVATAR / 2 - ABOVE_NODE,
            }}
          >
            <PixelAvatar
              spriteId={m.avatar_sprite_id}
              color={m.avatar_color}
              label={m.display_name ?? 'Traveler'}
              size="sm"
            />
          </View>
        ));
      })}
    </View>
  );
}
