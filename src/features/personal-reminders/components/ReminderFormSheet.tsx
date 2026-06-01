import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';

import { usePersonalReminderActions } from '../hooks/usePersonalReminders';

export type ReminderFormSheetRef = PixelBottomSheetRef;

export const ReminderFormSheet = forwardRef<ReminderFormSheetRef>((_props, ref) => {
  const { t } = useTranslation();
  const { create } = usePersonalReminderActions();
  const sheetRef = useRef<PixelBottomSheetRef>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  useImperativeHandle(ref, () => ({
    open: (i?: number) => sheetRef.current?.open(i),
    close: () => sheetRef.current?.close(),
  }));

  const submit = () => {
    if (!title.trim() || !date.trim()) return;
    create.mutate(
      { title: title.trim(), targetDate: date.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setDate('');
          sheetRef.current?.close();
        },
      },
    );
  };

  return (
    <PixelBottomSheet ref={sheetRef} snapPoints={['55%']}>
      <View className="gap-3 p-4">
        <PixelInput
          label={t('lifeReminders.form.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('lifeReminders.form.titlePlaceholder')}
        />
        <PixelInput
          label={t('lifeReminders.form.dateLabel')}
          value={date}
          onChangeText={setDate}
          placeholder="2026-12-31"
          autoCapitalize="none"
        />
        <PixelButton onPress={submit} loading={create.isPending}>
          {t('lifeReminders.form.save')}
        </PixelButton>
      </View>
    </PixelBottomSheet>
  );
});
ReminderFormSheet.displayName = 'ReminderFormSheet';
