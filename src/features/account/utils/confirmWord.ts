import type { SupportedLocale } from '@core/i18n';

/**
 * The magic word a user must type to confirm account deletion, per locale. These MUST match the
 * uppercase token embedded in the `account.delete.confirmLabel` copy ("Type DELETE to confirm" /
 * "Tapez SUPPRIMER pour confirmer"). Kept here (not in the i18n bundle) so the comparison value is
 * owned by this feature; if the seed copy's word ever changes, update this map too.
 */
const CONFIRM_WORD_BY_LOCALE: Record<SupportedLocale, string> = {
  en: 'DELETE',
  fr: 'SUPPRIMER',
};

const FALLBACK_CONFIRM_WORD = CONFIRM_WORD_BY_LOCALE.en;

/** The expected confirm word for a locale (falls back to the English token). */
export function confirmWordForLocale(locale: string): string {
  return CONFIRM_WORD_BY_LOCALE[locale as SupportedLocale] ?? FALLBACK_CONFIRM_WORD;
}

/** True when the typed value matches the locale's confirm word (case-insensitive, trimmed). */
export function matchesConfirmWord(typed: string, locale: string): boolean {
  return typed.trim().toUpperCase() === confirmWordForLocale(locale);
}
