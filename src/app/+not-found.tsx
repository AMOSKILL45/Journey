import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-cream px-4">
        <PixelText size="h2" className="mb-4">
          404
        </PixelText>
        <PixelText size="body" className="mb-6 text-text-secondary">
          {t('common.error')}
        </PixelText>
        <Link href="/" className="text-primary-600 underline">
          <PixelText size="body" className="text-primary-600">
            {t('common.back')}
          </PixelText>
        </Link>
      </View>
    </>
  );
}
