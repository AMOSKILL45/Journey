import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { findSpriteById } from '@assets/sprites/milestones/manifest';
import { cn } from '@shared/utils/cn';

import type { Milestone } from '../api/milestones';
import { NODE_RADIUS } from '../utils/pathLayout';

export type MilestoneNodeState = 'locked' | 'available' | 'current' | 'completed';

export interface MilestoneNodeProps {
  milestone: Milestone;
  state: MilestoneNodeState;
  onPress?: () => void;
  onLongPress?: () => void;
}

const BG_BY_STATE: Record<MilestoneNodeState, string> = {
  locked: 'bg-surface-alt',
  available: 'bg-sky-500',
  current: 'bg-accent-500',
  completed: 'bg-success',
};

const RING_BY_STATE: Record<MilestoneNodeState, string> = {
  locked: 'border-text-disabled',
  available: 'border-primary-600',
  current: 'border-primary-600',
  completed: 'border-border',
};

export function MilestoneNode({ milestone, state, onPress, onLongPress }: MilestoneNodeProps) {
  const sprite = milestone.sprite_id ? findSpriteById(milestone.sprite_id) : undefined;
  const sizeBoost = milestone.is_boss ? 1.35 : 1;
  const size = NODE_RADIUS * 2 * sizeBoost;

  const handlePress = () => {
    if (state === 'locked') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleLongPress = () => {
    if (state === 'locked') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${milestone.name}, ${state}`}
      accessibilityState={{ disabled: state === 'locked' }}
      hitSlop={8}
    >
      <View
        className={cn(
          'items-center justify-center rounded-full border-pixel-lg',
          BG_BY_STATE[state],
          RING_BY_STATE[state],
          state === 'locked' && 'opacity-50',
        )}
        style={{
          width: size,
          height: size,
          shadowColor: '#0F1A2E',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        {sprite ? (
          <Image
            source={sprite.source}
            style={{ width: size * 0.6, height: size * 0.6 }}
            contentFit="contain"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
