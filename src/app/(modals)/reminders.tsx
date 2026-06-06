import { useRef } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import {
  LifeReminderRow,
  ReminderFormSheet,
  type ReminderFormSheetRef,
  usePersonalReminderActions,
  usePersonalReminders,
} from '@features/personal-reminders';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

export default function RemindersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data = [], isLoading, isError, refetch } = usePersonalReminders();
  const { remove } = usePersonalReminderActions();
  const formRef = useRef<ReminderFormSheetRef>(null);

  const openForm = () => formRef.current?.open();

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-4 px-6">
        {t('lifeReminders.screen.title')}
      </PixelText>
      {isError ? (
        <ErrorState
          testID="reminders-error"
          title={t('common.error')}
          body={t('common.somethingWentWrong')}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <LoadingState testID="reminders-loading" variant="skeleton" label={t('common.loading')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => remove.mutate(item.id)}
              accessibilityRole="button"
              accessibilityLabel={
                item.reminder_type === 'custom' && item.title
                  ? item.title
                  : t(`lifeReminders.types.${item.reminder_type}`)
              }
            >
              <LifeReminderRow
                type={item.reminder_type}
                title={item.title}
                targetDate={item.target_date}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              testID="reminders-empty"
              title={t('emptyStates.lifeReminders.title')}
              body={t('emptyStates.lifeReminders.body')}
              actionLabel={t('emptyStates.lifeReminders.action')}
              onAction={openForm}
            />
          }
        />
      )}
      <View className="px-6 pb-6">
        <PixelButton onPress={openForm} fullWidth>
          {t('lifeReminders.screen.add')}
        </PixelButton>
      </View>
      <ReminderFormSheet ref={formRef} />
    </View>
  );
}
