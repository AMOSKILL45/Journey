import { useMutation } from '@tanstack/react-query';

import { updateMyProfile, useProfile, type ProfileUpdate } from '@features/profile';

import { defaultPrefs, type NotificationPrefs } from '../utils/categories';

export function useNotificationPrefs() {
  const { data: profile, refetch } = useProfile();
  const prefs: NotificationPrefs =
    (profile?.preferences as { notifications?: NotificationPrefs } | null)?.notifications ??
    defaultPrefs();
  const save = useMutation({
    mutationFn: (next: NotificationPrefs) => {
      const merged = {
        ...((profile?.preferences as Record<string, unknown>) ?? {}),
        notifications: next,
      };
      return updateMyProfile({ preferences: merged as unknown as ProfileUpdate['preferences'] });
    },
    onSuccess: () => void refetch(),
  });
  return { prefs, save };
}
