import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { useExportAccountData } from '../hooks/useExportAccountData';

/**
 * "Export my data" entry (spec §6.2). Triggers the GDPR export → writes a JSON file → opens the OS
 * share sheet. Shows a preparing label while in flight and `account.export.error` on failure.
 */
export function ExportDataRow() {
  const { t } = useTranslation();
  const exporter = useExportAccountData();

  return (
    <View className="gap-1">
      <PixelButton
        variant="secondary"
        fullWidth
        loading={exporter.isPending}
        accessibilityLabel={t('account.export.cta')}
        onPress={() => exporter.mutate()}
      >
        {exporter.isPending ? t('account.export.preparing') : t('account.export.cta')}
      </PixelButton>
      {exporter.isError ? (
        <View accessibilityLiveRegion="polite">
          <PixelText size="small" className="mt-1 text-error">
            {t('account.export.error')}
          </PixelText>
        </View>
      ) : null}
    </View>
  );
}
