import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useTranslation } from '@core/i18n';
import { AppleSignInButton, GoogleSignInButton, useAuth } from '@features/auth';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

const emailSchema = z.string().email();

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendMagicLink, pending, error } = useAuth();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  const [socialError, setSocialError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setValidationError(t('auth.signIn.emailInvalid'));
      return;
    }
    setValidationError(undefined);
    try {
      await sendMagicLink(email);
      router.push({ pathname: '/(auth)/check-email', params: { email } });
    } catch {
      /* error rendered via `error` from useAuth */
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-cream"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 justify-center px-6">
        <PixelText size="display-lg" family="pixel" className="mb-4 text-center text-primary-600">
          THIS IS THE{'\n'}JOURNEY
        </PixelText>
        <PixelText size="h3" className="mb-2 text-center">
          {t('auth.signIn.title')}
        </PixelText>
        <PixelText size="body" className="mb-6 text-center text-text-secondary">
          {t('auth.signIn.subtitle')}
        </PixelText>

        <PixelInput
          label={t('auth.signIn.emailLabel')}
          placeholder={t('auth.signIn.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          required
          errorText={validationError ?? error?.message}
          containerClassName="mb-4"
        />

        <PixelButton onPress={handleSubmit} loading={pending} fullWidth>
          {t('auth.signIn.sendLinkButton')}
        </PixelButton>

        <View className="my-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <PixelText size="caption" className="text-text-secondary">
            {t('auth.signIn.orContinueWith')}
          </PixelText>
          <View className="h-px flex-1 bg-border" />
        </View>

        <View className="gap-3">
          <AppleSignInButton
            onError={(e) => setSocialError(e.message || t('auth.signIn.appleError'))}
          />
          <GoogleSignInButton
            onError={(e) => setSocialError(e.message || t('auth.signIn.googleError'))}
          />
        </View>

        {socialError ? (
          <PixelText size="caption" className="mt-3 text-center text-error">
            {socialError}
          </PixelText>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
