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
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

export default function RemindersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data = [] } = usePersonalReminders();
  const { remove } = usePersonalReminderActions();
  const formRef = useRef<ReminderFormSheetRef>(null);

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-4 px-6">
        {t('lifeReminders.screen.title')}
      </PixelText>
      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove.mutate(item.id)}>
            <LifeReminderRow
              type={item.reminder_type}
              title={item.title}
              targetDate={item.target_date}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <PixelText size="body" className="mt-8 text-center text-text-secondary">
            {t('lifeReminders.screen.empty')}
          </PixelText>
        }
      />
      <View className="px-6 pb-6">
        <PixelButton onPress={() => formRef.current?.open()} fullWidth>
          {t('lifeReminders.screen.add')}
        </PixelButton>
      </View>
      <ReminderFormSheet ref={formRef} />
    </View>
  );
}
