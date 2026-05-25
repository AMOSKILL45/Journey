import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useAuth } from '@features/auth';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const { sendMagicLink, pending } = useAuth();

  return (
    <View className="flex-1 justify-center bg-cream px-6" style={{ paddingTop: insets.top }}>
      <PixelText size="display-lg" className="mb-4 text-center">
        📬
      </PixelText>
      <PixelText size="h2" className="mb-2 text-center">
        {t('auth.checkEmail.title')}
      </PixelText>
      <PixelText size="body" className="mb-8 text-center text-text-secondary">
        {t('auth.checkEmail.subtitle', { email })}
      </PixelText>
      {/* i18n-js uses %{var} interpolation; locale strings use %{email}. */}
      <PixelButton
        variant="ghost"
        loading={pending}
        onPress={() => email && void sendMagicLink(email)}
        fullWidth
        className="mb-3"
      >
        {t('auth.checkEmail.resend')}
      </PixelButton>
      <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
        {t('auth.checkEmail.back')}
      </PixelButton>
    </View>
  );
}
