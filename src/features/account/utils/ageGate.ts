/**
 * Age-gate flag (10E / spec §6.3). A minimal 13+ / 16-EU self-confirmation stored as a boolean
 * in `profiles.preferences.age_confirmed`. No DOB is collected and no heavy verification is done.
 *
 * These are pure helpers over the `preferences` jsonb blob so the read/merge logic is unit-testable
 * without the network — the hook layer wires them to the profile read/update (same idiom as
 * `useNotificationPrefs`).
 */

/** Key under `profiles.preferences` holding the confirmation flag. */
export const AGE_CONFIRMED_KEY = 'age_confirmed';

type Preferences = Record<string, unknown> | null | undefined;

/** True only when the user has explicitly confirmed they meet the minimum age. */
export function isAgeConfirmed(preferences: Preferences): boolean {
  if (!preferences || typeof preferences !== 'object') return false;
  return (preferences as Record<string, unknown>)[AGE_CONFIRMED_KEY] === true;
}

/**
 * Merge the confirmation flag into an existing preferences blob without dropping other keys
 * (notifications, readable mode, etc.). Returns a new object — never mutates the input.
 */
export function withAgeConfirmed(
  preferences: Preferences,
  confirmed = true,
): Record<string, unknown> {
  const base = preferences && typeof preferences === 'object' ? preferences : {};
  return { ...(base as Record<string, unknown>), [AGE_CONFIRMED_KEY]: confirmed };
}
