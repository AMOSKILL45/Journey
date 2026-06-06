import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Persisted first-run flags (10A). `introSeen` gates the onboarding carousel;
 * it is read by the root layout BEFORE sign-in and set when the user finishes
 * or skips the intro.
 *
 * `hydrated` flips true once the persisted state has rehydrated from
 * AsyncStorage, so the gate can avoid flashing the intro before the real flag
 * is known.
 */
interface OnboardingFlagsState {
  introSeen: boolean;
  hydrated: boolean;
  setIntroSeen: (v: boolean) => void;
  setHydrated: (v: boolean) => void;
}

/**
 * AsyncStorage key for the persisted onboarding flags. Single source of truth — imported by
 * `clearLocalCaches` (account deletion) so the two can never drift (a drift would silently skip
 * the first-run intro for the next user on a device where an account was deleted).
 */
export const ONBOARDING_FLAGS_STORAGE_KEY = 'onboarding.flags.v1';

export const useOnboardingFlags = create<OnboardingFlagsState>()(
  persist(
    (set) => ({
      introSeen: false,
      hydrated: false,
      setIntroSeen: (v) => set({ introSeen: v }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: ONBOARDING_FLAGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ introSeen: s.introSeen }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Imperative read of the intro flag (for non-React call sites). */
export function hasSeenIntro(): boolean {
  return useOnboardingFlags.getState().introSeen;
}

/** Mark the first-run intro as seen (persisted). Idempotent. */
export function markIntroSeen(): void {
  useOnboardingFlags.getState().setIntroSeen(true);
}
