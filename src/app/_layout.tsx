import '@/../global.css';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initPostHog } from '@core/posthog';
import { initSentry } from '@core/sentry';
import { supabase } from '@core/supabase/client';
import { colors } from '@core/theme';
import { acceptInvitation } from '@features/trips';

const QUERY_STALE_MS = 60_000;
const INVITE_TOKEN_REGEX = /\/invite\/([A-Za-z0-9_-]+)/;

SplashScreen.preventAutoHideAsync();

async function handleInviteDeepLink(url: string): Promise<void> {
  const match = INVITE_TOKEN_REGEX.exec(url);
  if (!match) return;
  const token = match[1];
  try {
    const { trip_id } = await acceptInvitation(token);
    router.push(`/(modals)/trip/${trip_id}`);
  } catch {
    // Silent fail at the global handler level. The trip detail screen will surface
    // any user-facing error if they retry the action explicitly.
  }
}

function handleDeepLink(url: string): void {
  handleAuthDeepLink(url);
  void handleInviteDeepLink(url);
}

function handleAuthDeepLink(url: string): void {
  if (!url.includes('auth/callback')) return;
  // Supabase OAuth/magic-link callbacks pass tokens in the URL fragment (`#access_token=…`).
  // Parse both fragment and query for safety.
  const fragmentIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const payload =
    fragmentIdx >= 0 ? url.slice(fragmentIdx + 1) : queryIdx >= 0 ? url.slice(queryIdx + 1) : '';
  if (!payload) return;
  const params = new URLSearchParams(payload);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: QUERY_STALE_MS, retry: 1 } },
      }),
  );

  useEffect(() => {
    initSentry();
    void initPostHog();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    void Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.cream },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="(modals)/onboarding"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
