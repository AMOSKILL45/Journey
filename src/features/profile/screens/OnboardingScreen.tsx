import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { AvatarSpritePicker } from '../components/AvatarSpritePicker';
import { CountryPicker } from '../components/CountryPicker';
import { useProfile } from '../hooks/useProfile';

export function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile, updateProfile, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [spriteId, setSpriteId] = useState(profile?.avatar_sprite_id ?? 'avatars/adventurer_1');
  const [passportCountry, setPassportCountry] = useState<string | null>(
    profile?.passport_country ?? null,
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = displayName.trim().length >= 2;

  const handleSave = async () => {
    setSaveError(null);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        avatar_sprite_id: spriteId,
        passport_country: passportCountry,
      });
      router.replace('/(tabs)');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const handleSkip = () => router.replace('/(tabs)');

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <PixelText size="h1" className="mb-2">
        {t('profile.onboarding.title')}
      </PixelText>
      <PixelText size="body" className="mb-6 text-text-secondary">
        {t('profile.onboarding.subtitle')}
      </PixelText>

      <PixelInput
        label={t('profile.onboarding.displayNameLabel')}
        value={displayName}
        onChangeText={setDisplayName}
        containerClassName="mb-4"
      />

      <PixelText size="small" family="body-medium" className="mb-2 text-text-primary">
        {t('profile.onboarding.avatarLabel')}
      </PixelText>
      <View className="mb-4 h-72">
        <AvatarSpritePicker value={spriteId} onChange={setSpriteId} />
      </View>

      <View className="mb-6">
        <CountryPicker
          value={passportCountry}
          onChange={setPassportCountry}
          label={t('profile.onboarding.passportLabel')}
          helperText={t('profile.onboarding.passportHelper')}
        />
      </View>

      <PixelButton
        onPress={handleSave}
        disabled={!canSave}
        loading={isUpdating}
        fullWidth
        className="mb-3"
      >
        {t('profile.onboarding.saveButton')}
      </PixelButton>
      {saveError ? (
        <PixelText size="caption" className="mb-2 text-center text-error">
          {saveError}
        </PixelText>
      ) : null}
      <PixelButton variant="ghost" onPress={handleSkip} fullWidth>
        {t('profile.onboarding.skipButton')}
      </PixelButton>
    </ScrollView>
  );
}
