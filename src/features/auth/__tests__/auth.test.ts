import { Platform } from 'react-native';

import { supabase } from '@core/supabase/client';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1, WHITE_OUTLINE: 2 },
  AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 },
}));

import * as AppleAuthentication from 'expo-apple-authentication';

import {
  AUTH_REDIRECT_URL,
  AuthCancelledError,
  isAppleSignInAvailable,
  signInWithApple,
  signInWithMagicLink,
  signOut,
} from '../api/auth';

describe('auth.api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('signInWithMagicLink calls supabase OTP with our redirect scheme', async () => {
    const spy = jest
      .spyOn(supabase.auth, 'signInWithOtp')
      .mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
    await signInWithMagicLink('test@example.com');
    expect(spy).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { emailRedirectTo: AUTH_REDIRECT_URL },
    });
  });

  it('signInWithMagicLink throws on supabase error', async () => {
    jest.spyOn(supabase.auth, 'signInWithOtp').mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Boom' },
    } as never);
    await expect(signInWithMagicLink('x@y.com')).rejects.toMatchObject({ message: 'Boom' });
  });

  it('signOut delegates to supabase', async () => {
    const spy = jest.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null } as never);
    await signOut();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('auth.api Apple Sign-In', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('isAppleSignInAvailable returns false on Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(await isAppleSignInAvailable()).toBe(false);
  });

  it('isAppleSignInAvailable defers to AppleAuthentication on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await isAppleSignInAvailable()).toBe(true);
  });

  it('signInWithApple throws on Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    await expect(signInWithApple()).rejects.toThrow(/only available on iOS/);
  });

  it('signInWithApple wraps cancellations into AuthCancelledError', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const cancelErr = Object.assign(new Error('cancel'), { code: 'ERR_REQUEST_CANCELED' });
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce(cancelErr);
    await expect(signInWithApple()).rejects.toBeInstanceOf(AuthCancelledError);
  });

  it('signInWithApple passes identity token to supabase', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({
      identityToken: 'token-xyz',
    });
    const spy = jest
      .spyOn(supabase.auth, 'signInWithIdToken')
      .mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
    await signInWithApple();
    expect(spy).toHaveBeenCalledWith({ provider: 'apple', token: 'token-xyz' });
  });

  it('signInWithApple throws when identityToken is missing', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({ identityToken: null });
    await expect(signInWithApple()).rejects.toThrow(/missing identity token/);
  });
});
