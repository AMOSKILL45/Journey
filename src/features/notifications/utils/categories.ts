export const NOTIFICATION_CATEGORIES = [
  'friends_checkin',
  'friends_photo',
  'smart_reminders',
  'life_reminders',
  'join',
  'polls',
  'achievements',
  'time_capsule',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ALWAYS_ON: NotificationCategory[] = ['join'];

export interface NotificationPrefs {
  enabled: boolean;
  categories: Partial<Record<string, boolean>>;
  quietHours: boolean;
}

export function defaultPrefs(): NotificationPrefs {
  const categories: Record<string, boolean> = {};
  for (const c of NOTIFICATION_CATEGORIES) categories[c] = true;
  return { enabled: true, categories, quietHours: true };
}

export function shouldSendCategory(prefs: NotificationPrefs, category: string): boolean {
  if (ALWAYS_ON.includes(category as NotificationCategory)) return true;
  if (!prefs.enabled) return false;
  return prefs.categories[category] !== false; // default on when unspecified
}
