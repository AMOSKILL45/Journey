/**
 * Validation helpers for the OnboardingScreen form. Extracted so they can be
 * unit-tested without rendering the screen (which depends on expo-image +
 * react-native-safe-area-context, both flaky in Jest).
 */

export const MIN_NAME_LENGTH = 2;

/**
 * E.164 phone number format: `+` followed by 1-3 digit country code and
 * 4-14 more digits. Total digits (excluding `+`) must be between 7 and 15.
 * Accepts spaces and dashes during input by stripping them.
 */
export function isValidE164PhoneNumber(input: string): boolean {
  const stripped = input.replace(/[\s-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(stripped)) return false;
  return true;
}

/** Convert a Date (local TZ) to YYYY-MM-DD (UTC) for Postgres `date` columns. */
export function toISODateOrNull(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}
