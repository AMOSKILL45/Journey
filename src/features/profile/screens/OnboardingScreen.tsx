import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { AvatarSpritePicker } from '../components/AvatarSpritePicker';
import { CountryPicker } from '../components/CountryPicker';
import { useProfile } from '../hooks/useProfile';
import {
  MIN_NAME_LENGTH,
  isValidE164PhoneNumber,
  toISODateOrNull,
} from '../utils/onboardingValidation';

export function OnboardingScreen() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile, updateProfile, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '');
  const [spriteId, setSpriteId] = useState(profile?.avatar_sprite_id ?? 'avatars/adventurer_1');
  const [passportCountry, setPassportCountry] = useState<string | null>(
    profile?.passport_country ?? null,
  );
  const [passportExpiry, setPassportExpiry] = useState<Date | null>(
    profile?.passport_expires_at ? new Date(profile.passport_expires_at) : null,
  );
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    displayName.trim().length >= MIN_NAME_LENGTH &&
    firstName.trim().length >= MIN_NAME_LENGTH &&
    lastName.trim().length >= MIN_NAME_LENGTH &&
    (phoneNumber.trim() === '' || isValidE164PhoneNumber(phoneNumber));

  const handleSave = async () => {
    setSaveError(null);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        avatar_sprite_id: spriteId,
        passport_country: passportCountry,
        passport_expires_at: toISODateOrNull(passportExpiry),
      });
      router.replace('/(tabs)');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const localeStr = locale === 'fr' ? 'fr-FR' : 'en-US';
  const formatDate = (d: Date) => d.toLocaleDateString(localeStr);

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

      <PixelInput
        label={t('profile.onboarding.firstNameLabel')}
        helperText={t('profile.onboarding.firstNameHelper')}
        value={firstName}
        onChangeText={setFirstName}
        containerClassName="mb-4"
        required
      />

      <PixelInput
        label={t('profile.onboarding.lastNameLabel')}
        value={lastName}
        onChangeText={setLastName}
        containerClassName="mb-4"
        required
      />

      <PixelInput
        label={t('profile.onboarding.phoneLabel')}
        helperText={t('profile.onboarding.phoneHelper')}
        placeholder="+33612345678"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        containerClassName="mb-4"
        keyboardType="phone-pad"
        autoCapitalize="none"
      />

      <PixelText size="small" family="body-medium" className="mb-2 text-text-primary">
        {t('profile.onboarding.avatarLabel')}
      </PixelText>
      <View className="mb-4 h-72">
        <AvatarSpritePicker value={spriteId} onChange={setSpriteId} />
      </View>

      <View className="mb-4">
        <CountryPicker
          value={passportCountry}
          onChange={setPassportCountry}
          label={t('profile.onboarding.passportLabel')}
          helperText={t('profile.onboarding.passportHelper')}
        />
      </View>

      <PixelText size="small" family="body-medium" className="mb-1">
        {t('profile.onboarding.passportExpiryLabel')}
      </PixelText>
      <PixelButton
        variant="ghost"
        onPress={() => setShowExpiryPicker(true)}
        fullWidth
        className="mb-1"
      >
        {passportExpiry ? formatDate(passportExpiry) : t('profile.onboarding.passportExpiryPick')}
      </PixelButton>
      <PixelText size="caption" className="mb-6 text-text-secondary">
        {t('profile.onboarding.passportExpiryHelper')}
      </PixelText>
      {showExpiryPicker && (
        <DateTimePicker
          value={passportExpiry ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, d) => {
            setShowExpiryPicker(Platform.OS === 'ios');
            if (d) setPassportExpiry(d);
          }}
        />
      )}

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
