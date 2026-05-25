import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@core/theme';
import { useProfile } from '@features/profile/hooks/useProfile';

import { useSession } from '../hooks/useSession';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.display_name) return <Redirect href="/(modals)/onboarding" />;
  return <>{children}</>;
}
