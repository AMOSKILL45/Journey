import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { signOut } from '@features/auth';
import { setAudioSuppressed } from '@features/feedback';

import { deleteAccount } from '../api/account';
import { clearLocalCaches } from '../utils/clearLocalCaches';

const SIGN_IN_ROUTE = '/(auth)/sign-in';

/**
 * Drive the destructive delete-account flow (spec §6.1):
 *  1. invoke the `delete-account` edge fn (server hard-deletes PII + anonymizes shared content);
 *  2. sign out (clears the Supabase auth session);
 *  3. clear local device caches (TanStack query cache, persisted Zustand stores, AsyncStorage
 *     flags incl. `onboarding_intro_seen`);
 *  4. route to sign-in.
 *
 * Sound is suppressed for the duration (6C sensitive-flow guard). On failure the mutation rejects
 * so the caller can surface `account.delete.error`; the session is left intact.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      setAudioSuppressed(true);
      try {
        await deleteAccount();
        await signOut();
        await clearLocalCaches(queryClient);
      } finally {
        setAudioSuppressed(false);
      }
    },
    onSuccess: () => {
      router.replace(SIGN_IN_ROUTE);
    },
  });
}
