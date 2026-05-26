import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@core/theme';
import { useSession } from '@features/auth';

// Max time we wait for the global deep-link handler (in app/_layout.tsx) to
// finish parsing the auth tokens and calling supabase.auth.setSession before
// falling back to the sign-in screen. The handler runs in parallel with
// expo-router's navigation, so the screen typically mounts with no session
// for a few hundred ms before the auth-state-change event lands.
const SESSION_TIMEOUT_MS = 5000;

export default function AuthCallbackScreen() {
  const { session, loading } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Session arrived (either pre-existing or just set by the deep-link handler).
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // useSession finished its initial check AND we've waited long enough for the
  // deep-link handler. Token was likely invalid/expired/stale — send back to sign-in.
  if (!loading && timedOut) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Otherwise: still waiting for the session to be set. Show a loader.
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator color={colors.primary[500]} size="large" />
    </View>
  );
}
