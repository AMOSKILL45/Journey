import { useState } from 'react';

import { AuthCancelledError, signInWithApple, signInWithMagicLink, signOut } from '../api/auth';

export function useAuth() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMagicLink = async (email: string) => {
    setPending(true);
    setError(null);
    try {
      await signInWithMagicLink(email);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setPending(false);
    }
  };

  const signInApple = async () => {
    setPending(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (e) {
      if (e instanceof AuthCancelledError) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setPending(false);
    }
  };

  const logOut = async () => {
    setPending(true);
    try {
      await signOut();
    } finally {
      setPending(false);
    }
  };

  return { sendMagicLink, signInApple, logOut, pending, error };
}
