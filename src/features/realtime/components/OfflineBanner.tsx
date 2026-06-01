import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import type { RealtimeStatus } from '../hooks/useTripChannel';

export function OfflineBanner({ status }: { status: RealtimeStatus }) {
  const { t } = useTranslation();
  if (status !== 'offline') return null;
  return (
    <View className="mb-2 rounded border-2 border-border bg-surface-alt p-2">
      <PixelText size="caption" className="text-text-secondary">
        {t('realtime.offline')}
      </PixelText>
    </View>
  );
}
