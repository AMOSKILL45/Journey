import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelText } from '@shared/components/PixelText';

import { LOCATION_SHARING_MODES } from '../api/sharing';
import { useLocationSharing } from '../hooks/useLocationSharing';

export function SharingControls({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data, update, startPanic, clearPanic } = useLocationSharing(tripId);
  const mode = data?.location_sharing ?? 'paused';
  const panicActive = !!data?.panic_until && new Date(data.panic_until).getTime() > Date.now();

  return (
    <View className="gap-2">
      <PixelText size="small" family="body-medium">
        {t('realtime.sharing.label')}
      </PixelText>
      <View className="flex-row flex-wrap gap-2">
        {LOCATION_SHARING_MODES.map((m) => (
          <PixelChip
            key={m}
            label={t(`realtime.sharing.${m}`)}
            selected={mode === m}
            onPress={() => update.mutate(m)}
          />
        ))}
      </View>
      {panicActive ? (
        <PixelButton variant="secondary" size="sm" onPress={() => clearPanic.mutate()}>
          {t('realtime.panic.active')}
        </PixelButton>
      ) : (
        <PixelButton variant="danger" size="sm" onPress={() => startPanic.mutate()}>
          {t('realtime.panic.cta')}
        </PixelButton>
      )}
    </View>
  );
}
