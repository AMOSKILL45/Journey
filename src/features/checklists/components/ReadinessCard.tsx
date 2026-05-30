import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export interface ReadinessCardProps {
  ready: boolean;
  readyX: number;
  readyN: number;
  lateNames: string[];
  hasItems: boolean;
}

export function ReadinessCard({ ready, readyX, readyN, lateNames, hasItems }: ReadinessCardProps) {
  const { t } = useTranslation();
  return (
    <PixelCard className="mb-4">
      <PixelText size="small" family="body-medium" className="mb-1 text-text-secondary">
        {t('checklists.readiness.title')}
      </PixelText>
      {!hasItems ? (
        <PixelText size="body">{t('checklists.readiness.none')}</PixelText>
      ) : ready ? (
        <PixelText size="body">{t('checklists.readiness.ready')}</PixelText>
      ) : (
        <View className="gap-1">
          <PixelText size="body">
            {t('checklists.readiness.count', { x: readyX, n: readyN })}
          </PixelText>
          {lateNames.length > 0 ? (
            <PixelText size="caption" className="text-warning">
              {t('checklists.readiness.late', { names: lateNames.join(', ') })}
            </PixelText>
          ) : null}
        </View>
      )}
    </PixelCard>
  );
}
