import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { LifeReminderRow, usePersonalReminders } from '@features/personal-reminders';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';
import { cn } from '@shared/utils/cn';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';
import { useNotificationMutations, useNotifications } from '../hooks/useNotifications';

type Tab = 'notifications' | 'life';

export function InboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('notifications');
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { markRead } = useNotificationMutations();
  const { data: lifeReminders = [] } = usePersonalReminders();

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

      <View className="mb-3 flex-row gap-2 px-6">
        {(['notifications', 'life'] as const).map((key) => (
          <Pressable
            key={key}
            testID={`inbox-tab-${key}`}
            onPress={() => setTab(key)}
            accessibilityRole="button"
            className={cn(
              'rounded border-2 border-border px-3 py-2',
              tab === key ? 'bg-primary-600' : 'bg-surface-alt',
            )}
          >
            <PixelText size="caption" className={tab === key ? 'text-white' : 'text-text-primary'}>
              {t(`lifeReminders.tabs.${key}`)}
            </PixelText>
          </Pressable>
        ))}
      </View>

      {tab === 'notifications' ? (
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
      ) : (
        <FlatList
          data={lifeReminders}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <LifeReminderRow
              type={item.reminder_type}
              title={item.title}
              targetDate={item.target_date}
            />
          )}
          ListEmptyComponent={
            <PixelText size="body" className="mt-8 text-center text-text-secondary">
              {t('lifeReminders.screen.empty')}
            </PixelText>
          }
        />
      )}
    </View>
  );
}
