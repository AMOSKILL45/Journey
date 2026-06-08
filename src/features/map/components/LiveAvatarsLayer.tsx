import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@core/i18n';
import { useFeedbackSettings } from '@features/feedback/store/feedbackSettings';
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
const BOB_PX = 4; // gentle idle "breathing" height
const BOB_MS = 1100;
const PHASE_BUCKETS = 5; // desync travelers so they don't bob in lockstep

/** Deterministic 0..PHASE_BUCKETS-1 offset from the user id, so co-located avatars desync. */
function phaseFor(userId: string): number {
  let sum = 0;
  for (let i = 0; i < userId.length; i += 1) sum += userId.charCodeAt(i);
  return sum % PHASE_BUCKETS;
}

/** One traveler avatar with a gentle idle bob (skipped under reduce-motion). */
function BobbingAvatar({ member }: { member: LiveMember }) {
  const reduceMotion = useFeedbackSettings((s) => s.osReduceMotion);
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      y.value = 0;
      return undefined;
    }
    y.value = withDelay(
      phaseFor(member.user_id) * 160,
      withRepeat(withTiming(-BOB_PX, { duration: BOB_MS }), -1, true),
    );
    return () => cancelAnimation(y);
  }, [reduceMotion, member.user_id, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={style}>
      <PixelAvatar
        spriteId={member.avatar_sprite_id}
        color={member.avatar_color}
        label={member.display_name ?? t('profile.anonymous')}
        size="sm"
      />
    </Animated.View>
  );
}

/**
 * Renders each present traveler's avatar at a screen position computed by the
 * layer that owns the camera (OverworldLayer) — so avatars stay glued to their
 * node (or live GPS point). Co-located avatars fan out, each with a gentle idle
 * bob so the world feels alive. Pointer-transparent.
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
            <BobbingAvatar member={pl.member} />
          </View>
        )),
      )}
    </View>
  );
}
