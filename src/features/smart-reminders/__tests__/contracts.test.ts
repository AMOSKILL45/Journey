import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(__dirname, '../../../../supabase/migrations');

// All KB seed/alter migrations (not just the original) — so rules added in a later
// migration are gated too. Fixes the hard-coded-path coverage gap (see ADR-2).
function kbMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /country_requirements.*\.sql$/.test(f))
    .map((f) => path.join(MIGRATIONS_DIR, f));
}
function kbMigrationsSql(): string {
  return kbMigrationFiles()
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
}

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

  it('every seeded KB i18n_key (any migration) has a .title and .body in en and fr', () => {
    const sql = kbMigrationsSql();
    const keys = [...sql.matchAll(/'(smartReminders\.kb\.[a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const base of new Set(keys)) {
      for (const loc of [en, fr]) {
        expect(typeof resolveKey(loc, `${base}.title`)).toBe('string');
        expect(typeof resolveKey(loc, `${base}.body`)).toBe('string');
      }
    }
  });

  it('no KB seed migration auto-publishes drafts (only the *_verified_flag migration touches `verified`)', () => {
    // Safety gate (ADR-1): drafted rows stay verified=false until a human flips them.
    // Seeds must rely on the column DEFAULT — never set `verified` themselves. `last_verified`
    // is a different column and does not trip the \bverified\b word boundary.
    const offenders = kbMigrationFiles()
      .filter((f) => !/verified_flag/.test(f))
      .filter((f) => /\bverified\b/i.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.basename(f));
    expect(offenders).toEqual([]);
  });

  it('"smart_reminders" is a known notification category', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NOTIFICATION_CATEGORIES } = require('@features/notifications/utils/categories');
    expect(NOTIFICATION_CATEGORIES).toContain('smart_reminders');
  });
});
