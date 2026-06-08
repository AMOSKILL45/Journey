import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { type KbRuleMeta } from '../api/kbRules';
import { REPORT_REASONS, type ReportReason } from '../utils/reportReasons';

export interface SmartTipCardProps {
  requirementId: string;
  status: string;
  kb?: KbRuleMeta;
  onDone: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onOpen: () => void;
  onReport?: (reason: ReportReason) => void;
}

// Validate the scheme at the open sink (4A lesson): only ever open http(s) sources.
function openSource(url: string | null | undefined): void {
  if (url && /^https?:\/\//.test(url)) void Linking.openURL(url);
}

export function SmartTipCard({
  requirementId,
  kb,
  onDone,
  onSnooze,
  onDismiss,
  onOpen,
  onReport,
}: SmartTipCardProps) {
  const { t } = useTranslation();
  const [showReasons, setShowReasons] = useState(false);
  const base = `smartReminders.kb.${requirementId}`;
  const sourceUrl = kb?.source_urls?.[0] ?? kb?.action_url ?? null;

  return (
    <PixelCard className="mb-2">
      <View className="mb-1 flex-row items-center justify-between">
        <PixelText size="body" family="body-semibold" className="flex-1 pr-2">
          {t(`${base}.title`)}
        </PixelText>
        <PixelText size="caption" className={kb?.verified ? 'text-success' : 'text-warning'}>
          {kb?.verified ? t('smartReminders.badge.verified') : t('smartReminders.badge.community')}
        </PixelText>
      </View>

      <PixelText size="caption" className="mb-2 text-text-secondary">
        {t(`${base}.body`)}
      </PixelText>

      {sourceUrl ? (
        <Pressable
          testID="smarttip-source"
          onPress={() => openSource(sourceUrl)}
          accessibilityRole="link"
          accessibilityLabel={t('smartReminders.actions.source')}
          className="mb-2 self-start"
        >
          <PixelText size="caption" className="text-info underline">
            {t('smartReminders.actions.source')}
          </PixelText>
        </Pressable>
      ) : null}

      {kb && kb.report_count > 0 ? (
        <PixelText testID="smarttip-reportcount" size="caption" className="mb-2 text-warning">
          {`⚠ ${kb.report_count} ${t('smartReminders.report.countLabel')}`}
        </PixelText>
      ) : null}

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
        {onReport ? (
          <Pressable
            testID="smarttip-report"
            onPress={() => setShowReasons((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={t('smartReminders.actions.report')}
            className="rounded border-2 border-border bg-surface-alt px-3 py-2"
          >
            <PixelText size="caption">{t('smartReminders.actions.report')}</PixelText>
          </Pressable>
        ) : null}
      </View>

      {onReport && showReasons ? (
        <View className="mt-2 gap-2">
          <PixelText size="caption" className="text-text-secondary">
            {t('smartReminders.report.prompt')}
          </PixelText>
          <View className="flex-row flex-wrap gap-2">
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                testID={`smarttip-report-${reason}`}
                onPress={() => {
                  onReport(reason);
                  setShowReasons(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(`smartReminders.report.${reason}`)}
                className="rounded border-2 border-border bg-surface-alt px-3 py-2"
              >
                <PixelText size="caption">{t(`smartReminders.report.${reason}`)}</PixelText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </PixelCard>
  );
}
