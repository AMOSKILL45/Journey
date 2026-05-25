import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useProfile } from '@features/profile';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export default function HomeTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();

  const greeting = profile?.display_name
    ? t('home.greeting', { name: profile.display_name })
    : t('home.greetingAnonymous');

  return (
    <View className="flex-1 bg-cream px-6" style={{ paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-2">
        {greeting}
      </PixelText>
      <PixelText size="body" className="mb-6 text-text-secondary">
        {t('app.tagline')}
      </PixelText>

      <PixelCard padding="lg">
        <PixelText size="h3" className="mb-2">
          {t('home.emptyTitle')}
        </PixelText>
        <PixelText size="body" className="text-text-secondary">
          {t('home.emptyBody')}
        </PixelText>
      </PixelCard>
    </View>
  );
}
