import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import en from './locales/en.json';
import fr from './locales/fr.json';

export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const i18n = new I18n({ en, fr });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = detectInitialLocale();

function detectInitialLocale(): SupportedLocale {
  const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LOCALES as readonly string[]).includes(deviceLocale)
    ? (deviceLocale as SupportedLocale)
    : 'en';
}

// Subscribe pattern for hook
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return i18n.locale;
}

export const t = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options);

export const setLocale = (loc: SupportedLocale): void => {
  i18n.locale = loc;
  listeners.forEach((l) => l());
};

export const useTranslation = () => {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { t, locale, setLocale };
};
