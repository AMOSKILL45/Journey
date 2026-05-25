import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useAuth } from '@features/auth';
import { useProfile } from '@features/profile';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export default function ProfileTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logOut, pending } = useAuth();
  const { data: profile } = useProfile();

  return (
    <View className="flex-1 bg-cream px-6" style={{ paddingTop: insets.top + 24 }}>
      <PixelText size="h1" className="mb-6">
        {t('tabs.profile')}
      </PixelText>
      <PixelCard padding="lg" className="mb-6">
        <PixelText size="h3">{profile?.display_name ?? t('profile.anonymous')}</PixelText>
        {profile?.passport_country && (
          <PixelText size="small" className="mt-1 text-text-secondary">
            🛂 {profile.passport_country}
          </PixelText>
        )}
      </PixelCard>
      <PixelButton variant="danger" onPress={logOut} loading={pending}>
        {t('auth.signOut')}
      </PixelButton>
    </View>
  );
}
