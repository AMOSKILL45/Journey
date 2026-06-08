import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { usePersonalReminderActions } from '../hooks/usePersonalReminders';

export type ReminderFormSheetRef = PixelBottomSheetRef;

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const ReminderFormSheet = forwardRef<ReminderFormSheetRef>((_props, ref) => {
  const { t } = useTranslation();
  const { create } = usePersonalReminderActions();
  const sheetRef = useRef<PixelBottomSheetRef>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (i?: number) => sheetRef.current?.open(i),
    close: () => sheetRef.current?.close(),
  }));

  const submit = () => {
    if (!title.trim()) {
      setError(t('lifeReminders.form.titleRequired'));
      return;
    }
    if (!date) {
      setError(t('lifeReminders.form.dateRequired'));
      return;
    }
    create.mutate(
      { title: title.trim(), targetDate: date },
      {
        onSuccess: () => {
          setTitle('');
          setDate(null);
          setError(null);
          sheetRef.current?.close();
        },
      },
    );
  };

  return (
    <PixelBottomSheet ref={sheetRef} snapPoints={['75%', '95%']}>
      <View className="gap-4">
        <PixelText size="h2">{t('lifeReminders.form.heading')}</PixelText>

        <PixelInput
          label={t('lifeReminders.form.titleLabel')}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (error) setError(null);
          }}
          placeholder={t('lifeReminders.form.titlePlaceholder')}
          required
        />

        <View>
          <PixelText size="small" family="body-medium" className="mb-2">
            {t('lifeReminders.form.dateLabel')}
          </PixelText>
          <View className="flex-row items-center gap-3">
            <PixelButton
              variant="ghost"
              onPress={() => setShowPicker(true)}
              accessibilityLabel={
                date
                  ? `${t('lifeReminders.form.dateLabel')} ${date}`
                  : t('lifeReminders.form.pickDate')
              }
            >
              {date ?? t('lifeReminders.form.pickDate')}
            </PixelButton>
            {date ? (
              <Pressable
                onPress={() => setDate(null)}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                hitSlop={8}
              >
                <PixelText size="caption" className="text-error">
                  ✕
                </PixelText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {showPicker ? (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            onChange={(_e, picked) => {
              setShowPicker(Platform.OS === 'ios');
              if (picked) {
                setDate(isoDate(picked));
                if (error) setError(null);
              }
            }}
          />
        ) : null}

        {error ? (
          <PixelText size="caption" className="text-error" accessibilityRole="alert">
            {error}
          </PixelText>
        ) : null}

        <PixelButton onPress={submit} loading={create.isPending} fullWidth>
          {t('lifeReminders.form.save')}
        </PixelButton>
      </View>
    </PixelBottomSheet>
  );
});
ReminderFormSheet.displayName = 'ReminderFormSheet';
