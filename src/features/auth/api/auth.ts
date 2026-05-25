import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { env } from '@core/env';
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

let googleConfigured = false;
function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  const webClientId = env.googleWebClientId;
  if (!webClientId) {
    throw new Error('Google Sign-In not configured (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing).');
  }
  GoogleSignin.configure({
    webClientId,
    iosClientId: env.googleIosClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<void> {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch (e) {
    if (Platform.OS === 'android') throw e;
    // No Play Services on iOS — continue.
  }

  let idToken: string | null = null;
  try {
    const result = await GoogleSignin.signIn();
    // SDK v13+: result.data.idToken; older: result.idToken. Handle both shapes safely.
    const tokenFromData = (result as { data?: { idToken?: string | null } }).data?.idToken ?? null;
    const tokenLegacy = (result as { idToken?: string | null }).idToken ?? null;
    idToken = tokenFromData ?? tokenLegacy;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new AuthCancelledError();
    }
    throw e;
  }

  if (!idToken) {
    throw new Error('Google credential is missing identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  try {
    if (googleConfigured) await GoogleSignin.signOut();
  } catch {
    // Best-effort sign-out from Google; Supabase signOut is the source of truth.
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
