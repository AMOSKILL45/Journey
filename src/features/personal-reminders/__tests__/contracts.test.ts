import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { REMINDER_TYPES } from '../utils/reminderTypes';

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
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

describe('personal-reminders runtime contracts', () => {
  it('every static t("lifeReminders.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]lifeReminders\.([a-zA-Z0-9_.${}]+)[`'"]/g)) {
        if (!m[1].includes('${')) keys.add(`lifeReminders.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every reminder type has an i18n label in en and fr', () => {
    for (const ty of REMINDER_TYPES) {
      expect(typeof resolveKey(en, `lifeReminders.types.${ty}`)).toBe('string');
      expect(typeof resolveKey(fr, `lifeReminders.types.${ty}`)).toBe('string');
    }
  });

  it('life_reminders has a category label in en and fr', () => {
    expect(typeof resolveKey(en, 'notifications.categories.life_reminders')).toBe('string');
    expect(typeof resolveKey(fr, 'notifications.categories.life_reminders')).toBe('string');
  });
});
