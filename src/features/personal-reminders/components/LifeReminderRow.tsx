import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export interface LifeReminderRowProps {
  type: string; // reminder_type from DB; 'custom' renders the user title
  title: string | null;
  targetDate: string;
}

export function LifeReminderRow({ type, title, targetDate }: LifeReminderRowProps) {
  const { t } = useTranslation();
  const label = type === 'custom' && title ? title : t(`lifeReminders.types.${type}`);
  return (
    <View className="mb-2 flex-row items-center justify-between rounded border-2 border-border bg-surface p-3">
      <PixelText size="body" family="body-medium" numberOfLines={1} className="flex-1">
        {label}
      </PixelText>
      <PixelText size="caption" className="text-text-secondary">
        {targetDate}
      </PixelText>
    </View>
  );
}
