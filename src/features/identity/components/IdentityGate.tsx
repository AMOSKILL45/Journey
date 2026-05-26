import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { useIdentityVerification } from '../hooks/useIdentityVerification';

export interface IdentityGateProps {
  onSkip?: () => void;
}

export function IdentityGate({ onSkip }: IdentityGateProps) {
  const { t } = useTranslation();
  const { present, loading, status, error } = useIdentityVerification();

  return (
    <View className="px-4 py-6">
      <PixelCard variant="elevated" padding="lg">
        <PixelText size="h2" className="mb-2 text-center">
          {t('identity.gate.title')}
        </PixelText>
        <PixelText size="body" className="mb-4 text-center text-text-secondary">
          {t('identity.gate.subtitle')}
        </PixelText>

        <PixelButton
          onPress={() => {
            void present();
          }}
          loading={loading}
          fullWidth
          className="mb-3"
        >
          {t('identity.gate.cta')}
        </PixelButton>

        {onSkip ? (
          <PixelButton variant="ghost" onPress={onSkip} fullWidth>
            {t('identity.gate.skip')}
          </PixelButton>
        ) : null}

        {status === 'FlowCanceled' ? (
          <PixelText size="caption" className="mt-3 text-center text-text-secondary">
            {t('identity.canceled')}
          </PixelText>
        ) : null}
        {status === 'FlowFailed' || error ? (
          <PixelText size="caption" className="mt-3 text-center text-error">
            {error ?? t('common.error')}
          </PixelText>
        ) : null}
      </PixelCard>
    </View>
  );
}
