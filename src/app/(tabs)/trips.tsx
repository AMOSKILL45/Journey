import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export default function TripsTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-center bg-cream px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      <PixelText size="h1" className="mb-2">
        {t('tabs.trips')}
      </PixelText>
      <PixelText size="body" className="text-text-secondary">
        Coming in Phase 1 Task 14
      </PixelText>
    </View>
  );
}
