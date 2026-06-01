import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const SEED = path.join(
  __dirname,
  '../../../../supabase/migrations/20260601090002_country_requirements.sql',
);

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

describe('smart-reminders runtime contracts', () => {
  it('every static t("smartReminders.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]smartReminders\.([a-zA-Z0-9_.${}]+)[`'"]/g)) {
        if (!m[1].includes('${')) keys.add(`smartReminders.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every seeded KB i18n_key has a .title and .body in en and fr', () => {
    const sql = fs.readFileSync(SEED, 'utf8');
    const keys = [...sql.matchAll(/'(smartReminders\.kb\.[a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const base of new Set(keys)) {
      for (const loc of [en, fr]) {
        expect(typeof resolveKey(loc, `${base}.title`)).toBe('string');
        expect(typeof resolveKey(loc, `${base}.body`)).toBe('string');
      }
    }
  });

  it('"smart_reminders" is a known notification category', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NOTIFICATION_CATEGORIES } = require('@features/notifications/utils/categories');
    expect(NOTIFICATION_CATEGORIES).toContain('smart_reminders');
  });
});
