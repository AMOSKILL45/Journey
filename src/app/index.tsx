import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@features/auth';
// Import the store directly (not the @features/onboarding barrel) to keep this
// boot-critical route free of the carousel/sheet bundle (gesture-handler etc.).
import { useOnboardingFlags } from '@features/onboarding/store/onboardingFlags';

export default function IndexRoute() {
  const { session, loading } = useSession();
  const introSeen = useOnboardingFlags((s) => s.introSeen);
  const flagsHydrated = useOnboardingFlags((s) => s.hydrated);

  // Neutral cream hold while session + persisted flags resolve. The launch
  // overlay covers boot, so this only appears in rare post-splash re-renders —
  // no jarring spinner.
  if (loading || !flagsHydrated) {
    return <View className="flex-1 bg-cream" />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // First-run gate (10A): show the intro carousel before sign-in when it hasn't
  // been seen and there is no session. Flow: intro → sign-in → profile → app.
  return introSeen ? <Redirect href="/(auth)/sign-in" /> : <Redirect href="/(onboarding)/intro" />;
}
