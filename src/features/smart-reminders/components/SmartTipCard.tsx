import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export interface SmartTipCardProps {
  requirementId: string;
  status: string;
  onDone: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onOpen: () => void;
}

export function SmartTipCard({
  requirementId,
  onDone,
  onSnooze,
  onDismiss,
  onOpen,
}: SmartTipCardProps) {
  const { t } = useTranslation();
  const base = `smartReminders.kb.${requirementId}`;
  return (
    <PixelCard className="mb-2">
      <PixelText size="body" family="body-semibold">
        {t(`${base}.title`)}
      </PixelText>
      <PixelText size="caption" className="mb-2 text-text-secondary">
        {t(`${base}.body`)}
      </PixelText>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          testID="smarttip-done"
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.done')}
          className="rounded border-2 border-border bg-primary-600 px-3 py-2"
        >
          <PixelText size="caption" className="text-white">
            {t('smartReminders.actions.done')}
          </PixelText>
        </Pressable>
        <Pressable
          testID="smarttip-checklist"
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.addToChecklist')}
          className="rounded border-2 border-border bg-secondary-700 px-3 py-2"
        >
          <PixelText size="caption" className="text-white">
            {t('smartReminders.actions.addToChecklist')}
          </PixelText>
        </Pressable>
        <Pressable
          testID="smarttip-snooze"
          onPress={onSnooze}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.snooze')}
          className="rounded border-2 border-border bg-surface-alt px-3 py-2"
        >
          <PixelText size="caption">{t('smartReminders.actions.snooze')}</PixelText>
        </Pressable>
        <Pressable
          testID="smarttip-dismiss"
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.dismiss')}
          className="rounded border-2 border-border bg-surface-alt px-3 py-2"
        >
          <PixelText size="caption">{t('smartReminders.actions.dismiss')}</PixelText>
        </Pressable>
      </View>
    </PixelCard>
  );
}
