import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { LifeReminderRow, usePersonalReminders } from '@features/personal-reminders';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';
import { cn } from '@shared/utils/cn';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';
import { useNotificationMutations, useNotifications } from '../hooks/useNotifications';

type Tab = 'notifications' | 'life';

const LIST_BOTTOM_PADDING = 120;

export function InboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('notifications');
  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
  const { markRead } = useNotificationMutations();
  const { data: lifeReminders = [] } = usePersonalReminders();

  const onPress = (n: AppNotification) => {
    if (n.read_at === null) markRead.mutate(n.id);
    const tripId = (n.data as { tripId?: string } | null)?.tripId;
    if (tripId) router.push(`/(modals)/trip/${tripId}`);
  };

  const renderNotifications = () => {
    if (isLoading) {
      return <LoadingState variant="skeleton" label={t('common.loading')} testID="inbox-loading" />;
    }
    if (isError) {
      return (
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('common.error')}
          onRetry={() => void refetch()}
          testID="inbox-error"
        />
      );
    }
    return (
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        onRefresh={() => void refetch()}
        refreshing={isLoading}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: LIST_BOTTOM_PADDING,
        }}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => onPress(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title={t('emptyStates.inbox.title')}
            body={t('emptyStates.inbox.body')}
            actionLabel={t('emptyStates.inbox.action')}
            onAction={() => router.replace('/(tabs)/trips')}
            testID="inbox-empty"
          />
        }
      />
    );
  };

  const renderLifeReminders = () => (
    <FlatList
      data={lifeReminders}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: LIST_BOTTOM_PADDING,
      }}
      renderItem={({ item }) => (
        <LifeReminderRow
          type={item.reminder_type}
          title={item.title}
          targetDate={item.target_date}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title={t('emptyStates.lifeReminders.title')}
          body={t('emptyStates.lifeReminders.body')}
          actionLabel={t('emptyStates.lifeReminders.action')}
          onAction={() => router.push('/(modals)/reminders')}
          testID="inbox-life-empty"
        />
      }
    />
  );

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-4 px-6">
        {t('tabs.inbox')}
      </PixelText>

      <View className="mb-3 flex-row gap-2 px-6">
        {(['notifications', 'life'] as const).map((key) => {
          const selected = tab === key;
          return (
            <Pressable
              key={key}
              testID={`inbox-tab-${key}`}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`lifeReminders.tabs.${key}`)}
              className={cn(
                'min-h-[44px] justify-center rounded border-2 border-border px-3 py-2',
                selected ? 'bg-primary-600' : 'bg-surface-alt',
              )}
            >
              <PixelText size="caption" className={selected ? 'text-white' : 'text-text-primary'}>
                {t(`lifeReminders.tabs.${key}`)}
              </PixelText>
            </Pressable>
          );
        })}
      </View>

      {tab === 'notifications' ? renderNotifications() : renderLifeReminders()}
    </View>
  );
}
