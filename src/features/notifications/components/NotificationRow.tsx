import { Pressable, View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import type { AppNotification } from '../api/notifications';

export interface NotificationRowProps {
  notification: AppNotification;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const unread = notification.read_at === null;
  // Read the whole row as one SR element (title + body). Unread state is conveyed
  // by a bolder title weight (non-color cue) in addition to the accent dot, so it
  // is never signalled by color alone.
  const a11yLabel = [notification.title, notification.body].filter(Boolean).join('. ');
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      className="mb-2 flex-row items-center gap-3 rounded border-2 border-border bg-surface p-3"
    >
      {unread ? (
        <View
          testID="notification-unread-dot"
          importantForAccessibility="no"
          className="h-2.5 w-2.5 rounded-full bg-primary-500"
        />
      ) : (
        <View className="h-2.5 w-2.5" importantForAccessibility="no" />
      )}
      <View className="flex-1" importantForAccessibility="no">
        <PixelText size="body" family={unread ? 'body-bold' : 'body-medium'} numberOfLines={1}>
          {notification.title}
        </PixelText>
        <PixelText size="caption" className="text-text-secondary" numberOfLines={2}>
          {notification.body}
        </PixelText>
      </View>
    </Pressable>
  );
}
