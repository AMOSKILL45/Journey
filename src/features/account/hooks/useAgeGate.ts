import { useMutation } from '@tanstack/react-query';

import { updateMyProfile, useProfile, type ProfileUpdate } from '@features/profile';

import { isAgeConfirmed, withAgeConfirmed } from '../utils/ageGate';

/**
 * Read + persist the age-gate confirmation (spec §6.3). The flag lives in
 * `profiles.preferences.age_confirmed`; this merges it without dropping other preference keys
 * (same pattern as `useNotificationPrefs`).
 *
 * `confirmed` is `false` until the profile has loaded with the flag set, so the gate surfaces
 * once and never blocks an already-confirmed user. `isLoading` lets callers avoid flashing the
 * gate before the profile resolves.
 */
export function useAgeGate() {
  const { data: profile, isLoading, refetch } = useProfile();
  const confirmed = isAgeConfirmed(profile?.preferences as Record<string, unknown> | null);

  const confirm = useMutation({
    mutationFn: () => {
      const merged = withAgeConfirmed(profile?.preferences as Record<string, unknown> | null);
      return updateMyProfile({ preferences: merged as unknown as ProfileUpdate['preferences'] });
    },
    onSuccess: () => void refetch(),
  });

  return { confirmed, isLoading, confirm };
}
