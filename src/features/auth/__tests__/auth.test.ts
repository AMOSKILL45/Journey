import { supabase } from '@core/supabase/client';

import { AUTH_REDIRECT_URL, signInWithMagicLink, signOut } from '../api/auth';

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
