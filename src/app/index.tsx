import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@features/auth';

export default function IndexRoute() {
  const { session, loading } = useSession();

  // Neutral cream hold while the session resolves. The launch overlay covers boot,
  // so this only appears in rare post-splash re-renders — no jarring spinner.
  if (loading) {
    return <View className="flex-1 bg-cream" />;
  }

  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/sign-in" />;
}
