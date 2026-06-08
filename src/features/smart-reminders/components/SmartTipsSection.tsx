import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { ErrorState } from '@shared/components/ErrorState';
import { PixelText } from '@shared/components/PixelText';

import { useKbRules, useReportKbRule } from '../hooks/useKbRules';
import { useSmartReminderActions, useSmartReminders } from '../hooks/useSmartReminders';

import { SmartTipCard } from './SmartTipCard';

export function SmartTipsSection({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useSmartReminders(tripId);
  const { markDone, snooze, dismiss } = useSmartReminderActions(tripId);
  const pending = (data ?? []).filter((r) => r.status === 'pending');
  const { byId } = useKbRules(pending.map((r) => r.requirement_id));
  const report = useReportKbRule();

  // Advisory section embedded in the trip screen: stay silent while loading or
  // when nothing is pending (no empty paralysis), but keep a recovery path on error.
  if (isError) {
    return (
      <View className="mb-4">
        <ErrorState
          testID="smarttips-error"
          title={t('common.error')}
          body={t('common.somethingWentWrong')}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }
  if (isLoading || !pending.length) return null;

  return (
    <View className="mb-4 gap-2">
      <PixelText size="h2" className="mb-1">
        {t('smartReminders.section.title')}
      </PixelText>
      <PixelText size="caption" className="mb-1 text-text-secondary">
        {t('smartReminders.disclaimer')}
      </PixelText>
      {pending.map((r) => (
        <SmartTipCard
          key={r.id}
          requirementId={r.requirement_id}
          status={r.status}
          kb={byId[r.requirement_id]}
          onDone={() => markDone.mutate(r.id)}
          onSnooze={() => snooze.mutate(r.id)}
          onDismiss={() => dismiss.mutate(r.id)}
          onOpen={() => {
            // Follow-up: deep-link to requirement.action_url / "add to checklist" (4B link).
          }}
          onReport={(reason) => report.mutate({ ruleId: r.requirement_id, reason })}
        />
      ))}
    </View>
  );
}
