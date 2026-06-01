/**
 * Runtime-contract tests for the Notifications feature: static `t('notifications.*')` keys resolve
 * in both locales, and every push category has an i18n label. Scans source (no mocks).
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { NOTIFICATION_CATEGORIES } from '../utils/categories';

const FEATURE_DIR = path.join(__dirname, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}
function resolveKey(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((a, p) => {
    if (a && typeof a === 'object') return (a as Record<string, unknown>)[p];
    return undefined;
  }, obj);
}

describe('notifications runtime contracts', () => {
  it('every static t("notifications.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*['"`]notifications\.([a-zA-Z0-9_.]+)['"`]/g)) {
        keys.add(`notifications.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every push category has an i18n label in en and fr', () => {
    for (const c of NOTIFICATION_CATEGORIES) {
      expect(typeof resolveKey(en, `notifications.categories.${c}`)).toBe('string');
      expect(typeof resolveKey(fr, `notifications.categories.${c}`)).toBe('string');
    }
  });
});
