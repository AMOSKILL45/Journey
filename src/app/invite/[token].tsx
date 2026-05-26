import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@core/theme';
import { useSession } from '@features/auth';
import { acceptInvitation } from '@features/trips';

type AcceptStatus =
  | { phase: 'pending' }
  | { phase: 'success'; tripId: string }
  | { phase: 'no-token' }
  | { phase: 'error' };

export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading: sessionLoading } = useSession();
  const [status, setStatus] = useState<AcceptStatus>({ phase: 'pending' });

  useEffect(() => {
    if (sessionLoading) return;
    if (!token) {
      setStatus({ phase: 'no-token' });
      return;
    }
    if (!session) {
      // acceptInvitation requires auth — bounce to sign-in. We lose the token here
      // (a future improvement: persist the pending invite token and replay it
      // post-login). For now, fail closed rather than crash on a 401.
      setStatus({ phase: 'error' });
      return;
    }
    let cancelled = false;
    void acceptInvitation(token)
      .then(({ trip_id }) => {
        if (!cancelled) setStatus({ phase: 'success', tripId: trip_id });
      })
      .catch(() => {
        if (!cancelled) setStatus({ phase: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, session, sessionLoading]);

  if (status.phase === 'success') {
    return <Redirect href={`/(modals)/trip/${status.tripId}`} />;
  }
  if (status.phase === 'no-token' || status.phase === 'error') {
    // Authenticated → land on tabs (home will show their existing trips).
    // Unauthenticated → AuthGuard on /(tabs) will bounce them to sign-in.
    return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator color={colors.primary[500]} size="large" />
    </View>
  );
}
