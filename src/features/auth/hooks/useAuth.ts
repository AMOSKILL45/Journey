import { useState } from 'react';

import { signInWithMagicLink, signOut } from '../api/auth';

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

  const logOut = async () => {
    setPending(true);
    try {
      await signOut();
    } finally {
      setPending(false);
    }
  };

  return { sendMagicLink, logOut, pending, error };
}
