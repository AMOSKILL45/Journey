import { Pressable, View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import type { AppNotification } from '../api/notifications';

export interface NotificationRowProps {
  notification: AppNotification;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const unread = notification.read_at === null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      className="mb-2 flex-row items-center gap-3 rounded border-2 border-border bg-surface p-3"
    >
      {unread ? (
        <View
          testID="notification-unread-dot"
          className="h-2.5 w-2.5 rounded-full bg-primary-500"
        />
      ) : (
        <View className="h-2.5 w-2.5" />
      )}
      <View className="flex-1">
        <PixelText size="body" family="body-medium" numberOfLines={1}>
          {notification.title}
        </PixelText>
        <PixelText size="caption" className="text-text-secondary" numberOfLines={2}>
          {notification.body}
        </PixelText>
      </View>
    </Pressable>
  );
}
