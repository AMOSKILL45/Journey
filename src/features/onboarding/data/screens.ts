/**
 * First-run onboarding screens (10A, UI spec §1). Content is i18n key-driven;
 * the illustration is a pixel-art placeholder (asset task) accessibility-labelled
 * by the screen heading. Pillars map to the product's four value props.
 */
export interface OnboardingScreenConfig {
  /** Stable key, also used as the FlatList item key + test id suffix. */
  key: 'plan' | 'path' | 'live' | 'private';
  /** i18n key for the heading. */
  titleKey: string;
  /** i18n key for the body copy. */
  bodyKey: string;
}

export const ONBOARDING_SCREENS: readonly OnboardingScreenConfig[] = [
  { key: 'plan', titleKey: 'onboarding.screen1.title', bodyKey: 'onboarding.screen1.body' },
  { key: 'path', titleKey: 'onboarding.screen2.title', bodyKey: 'onboarding.screen2.body' },
  { key: 'live', titleKey: 'onboarding.screen3.title', bodyKey: 'onboarding.screen3.body' },
  { key: 'private', titleKey: 'onboarding.screen4.title', bodyKey: 'onboarding.screen4.body' },
] as const;

export const ONBOARDING_SCREEN_COUNT = ONBOARDING_SCREENS.length;
