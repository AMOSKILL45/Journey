import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { supabase } from '@core/supabase/client';

export const AUTH_REDIRECT_URL = 'thisisthejourney://auth/callback';

export class AuthCancelledError extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'AuthCancelledError';
  }
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: AUTH_REDIRECT_URL },
  });
  if (error) throw error;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS.');
  }
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if (
      e instanceof Error &&
      'code' in e &&
      (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      throw new AuthCancelledError();
    }
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('Apple credential is missing identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
