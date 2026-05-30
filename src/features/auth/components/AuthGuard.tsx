import { Redirect } from 'expo-router';
import { ReactNode } from 'react';
import { View } from 'react-native';

import { useProfile } from '@features/profile/hooks/useProfile';

import { useSession } from '../hooks/useSession';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Neutral cream hold while session/profile resolve — matches the launch backdrop
  // so any brief post-splash flash stays seamless. No jarring spinner.
  if (sessionLoading || (session && profileLoading)) {
    return <View className="flex-1 bg-cream" />;
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.display_name) return <Redirect href="/(modals)/onboarding" />;
  return <>{children}</>;
}
