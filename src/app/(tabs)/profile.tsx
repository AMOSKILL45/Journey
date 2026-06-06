import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { AccountSettings, AgeGate } from '@features/account';
import { useAuth } from '@features/auth';
import { A11ySettings, FeedbackSettings } from '@features/feedback';
import { NotificationSettings } from '@features/notifications';
import { useProfile } from '@features/profile';
import {
  ProfileVisibilityToggle,
  type ProfileVisibility,
} from '@features/profile/components/ProfileVisibilityToggle';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

export default function ProfileTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logOut, pending } = useAuth();
  const { data: profile, updateProfile } = useProfile();
  const router = useRouter();

  const visibility: ProfileVisibility = profile?.visibility === 'public' ? 'public' : 'private';

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 24,
        paddingBottom: 48,
      }}
    >
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
      <PixelCard padding="lg" className="mb-6">
        <NotificationSettings />
      </PixelCard>
      <PixelCard padding="lg" className="mb-6">
        <FeedbackSettings />
      </PixelCard>
      <PixelCard padding="lg" className="mb-6">
        <A11ySettings />
      </PixelCard>
      <PixelCard padding="lg" className="mb-6">
        <PixelText size="h2" className="mb-2">
          {t('social.profile.makePublic')}
        </PixelText>
        <ProfileVisibilityToggle
          visibility={visibility}
          showGender={profile?.gender_visible_in_public ?? false}
          showAge={profile?.show_age_in_public ?? false}
          onChange={(next) => {
            void updateProfile({ visibility: next });
          }}
          onChangeGender={(next) => {
            void updateProfile({ gender_visible_in_public: next });
          }}
          onChangeAge={(next) => {
            void updateProfile({ show_age_in_public: next });
          }}
        />
      </PixelCard>
      <PixelButton
        variant="secondary"
        onPress={() => router.push('/(modals)/achievements')}
        className="mb-3"
        fullWidth
      >
        {t('achievements.screen.title')}
      </PixelButton>
      <PixelButton
        variant="secondary"
        onPress={() => router.push('/(modals)/passport')}
        className="mb-3"
        fullWidth
      >
        {t('passport.screen.title')}
      </PixelButton>
      <PixelButton
        variant="secondary"
        onPress={() => router.push('/(modals)/reminders')}
        className="mb-6"
        fullWidth
      >
        {t('lifeReminders.screen.title')}
      </PixelButton>
      <PixelButton
        variant="secondary"
        onPress={logOut}
        loading={pending}
        className="mb-6"
        fullWidth
      >
        {t('auth.signOut')}
      </PixelButton>
      <AccountSettings />
      <AgeGate />
    </ScrollView>
  );
}
