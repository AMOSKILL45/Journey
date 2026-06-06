import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

/**
 * AsyncStorage keys to drop on account deletion / hard sign-out so no per-user state leaks into
 * the next session on the same device. Kept explicit (vs `AsyncStorage.clear()`) to avoid nuking
 * unrelated keys and to make the intent auditable. Supabase's own auth-session key is cleared by
 * `supabase.auth.signOut()`, so it is intentionally not listed here.
 */
export const CLEARED_STORAGE_KEYS = [
  // First-run intro gate (10A) — re-show the carousel for whoever signs in next.
  'onboarding_intro_seen',
  // Persisted UI settings (6C feedback store + 10C readable mode).
  'feedback.settings.v1',
  // Achievement "seen" dedupe set (6A).
  'achievements.seen.v1',
] as const;

/**
 * Best-effort: remove a TanStack-persist cache key if one was configured. The app does not wire a
 * persister today, but clearing a known key keeps deletion correct if/when persistence is enabled.
 */
const TANSTACK_PERSIST_KEY = 'REACT_QUERY_OFFLINE_CACHE';

/**
 * Wipe all local, device-side caches after the server has deleted the account (or on a hard
 * sign-out). Order is not significant; each step is independent and failures are swallowed so a
 * single storage error never blocks the user from leaving a deleted account behind.
 *
 * Clears: the in-memory TanStack query cache, persisted Zustand stores (via their storage keys),
 * and the explicit AsyncStorage flag list above.
 */
export async function clearLocalCaches(queryClient: QueryClient): Promise<void> {
  try {
    queryClient.clear();
  } catch {
    // ignore — cache clearing must never throw
  }

  try {
    await AsyncStorage.multiRemove([...CLEARED_STORAGE_KEYS, TANSTACK_PERSIST_KEY]);
  } catch {
    // ignore — a storage failure must not block account deletion
  }
}
