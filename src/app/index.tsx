import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-cream px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      accessibilityLabel="Welcome screen"
    >
      <View className="mb-12 items-center">
        <PixelText size="display-lg" family="pixel" className="mb-4 text-center text-primary-600">
          THIS IS THE{'\n'}JOURNEY
        </PixelText>
        <PixelText size="lead" className="text-center text-text-secondary">
          {t('app.tagline')}
        </PixelText>
      </View>

      <View className="rounded border-pixel border-border bg-surface p-6 shadow-md">
        <PixelText size="h3" className="mb-2">
          {t('welcome.title')}
        </PixelText>
        <PixelText size="body" className="text-text-secondary">
          {t('welcome.subtitle')}
        </PixelText>
      </View>
    </View>
  );
}
