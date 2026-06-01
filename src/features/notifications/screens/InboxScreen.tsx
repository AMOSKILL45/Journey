import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';
import { useNotificationMutations, useNotifications } from '../hooks/useNotifications';

export function InboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { markRead } = useNotificationMutations();

  const onPress = (n: AppNotification) => {
    if (n.read_at === null) markRead.mutate(n.id);
    const tripId = (n.data as { tripId?: string } | null)?.tripId;
    if (tripId) router.push(`/(modals)/trip/${tripId}`);
  };

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-4 px-6">
        {t('tabs.inbox')}
      </PixelText>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        onRefresh={() => void refetch()}
        refreshing={isLoading}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => onPress(item)} />
        )}
        ListEmptyComponent={
          <PixelText size="body" className="mt-8 text-center text-text-secondary">
            {t('notifications.empty')}
          </PixelText>
        }
      />
    </View>
  );
}
