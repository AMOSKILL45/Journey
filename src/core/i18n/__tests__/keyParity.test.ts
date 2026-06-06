import en from '../locales/en.json';
import fr from '../locales/fr.json';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Deep-collect every leaf key path (dot-joined) from a locale object. */
function collectLeafKeys(value: Json, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const out: string[] = [];
  for (const key of Object.keys(value)) {
    const child = (value as { [k: string]: Json })[key];
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(...collectLeafKeys(child, path));
  }
  return out;
}

describe('i18n key parity (en ⟷ fr)', () => {
  const enKeys = new Set(collectLeafKeys(en as Json));
  const frKeys = new Set(collectLeafKeys(fr as Json));

  it('has no keys present in en but missing from fr', () => {
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k)).sort();
    expect(missingInFr).toEqual([]);
  });

  it('has no keys present in fr but missing from en', () => {
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k)).sort();
    expect(missingInEn).toEqual([]);
  });

  it('has identical leaf-key sets', () => {
    expect([...enKeys].sort()).toEqual([...frKeys].sort());
  });

  it('covers the Phase 10 namespaces the spec requires', () => {
    const required = [
      'onboarding.screen1.title',
      'onboarding.screen4.body',
      'onboarding.getStarted',
      'onboarding.priming.notifications.title',
      'onboarding.priming.location.body',
      'onboarding.priming.allow',
      'onboarding.priming.notNow',
      'account.ghostName',
      'account.delete.confirmCta',
      'account.export.cta',
      'account.ageGate.confirm',
      'legal.privacy',
      'legal.terms',
      'a11y.readableMode',
      'a11y.readableModeDescription',
      'common.retry',
      'common.somethingWentWrong',
      'emptyStates.trips.action',
      'emptyStates.discover.title',
    ];
    for (const key of required) {
      expect(enKeys.has(key)).toBe(true);
      expect(frKeys.has(key)).toBe(true);
    }
  });
});
