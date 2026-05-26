import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { usePassportExpiry, type ExpiryUrgency } from '../hooks/usePassportExpiry';

const URGENCY_CLASSES: Record<Exclude<ExpiryUrgency, 'none'>, { bg: string; text: string }> = {
  expired: { bg: 'bg-error', text: 'text-cream' },
  critical: { bg: 'bg-error', text: 'text-cream' },
  warning: { bg: 'bg-warning', text: 'text-text-primary' },
  notice: { bg: 'bg-accent-500', text: 'text-text-primary' },
  info: { bg: 'bg-sky-500', text: 'text-text-primary' },
};

export function PassportExpiryBanner() {
  const { t } = useTranslation();
  const { daysUntilExpiry, urgency } = usePassportExpiry();

  if (urgency === 'none' || daysUntilExpiry === null) return null;

  const cls = URGENCY_CLASSES[urgency];
  const title =
    urgency === 'expired'
      ? t('identity.passport.expired.title')
      : t('identity.passport.expiringSoon.title');
  const body =
    urgency === 'expired'
      ? t('identity.passport.expired.body')
      : t('identity.passport.expiringSoon.body', { count: Math.max(daysUntilExpiry, 0) });

  return (
    <View className="mb-4">
      <PixelCard variant="elevated" padding="md" className={cls.bg}>
        <PixelText size="body" family="heading" className={`mb-1 ${cls.text}`}>
          {title}
        </PixelText>
        <PixelText size="caption" className={cls.text}>
          {body}
        </PixelText>
      </PixelCard>
    </View>
  );
}
