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

  // (Removed 2026-06-07) The "no seed sets `verified`" guard is obsolete under the Waze model:
  // `verified` is now a trust BADGE, not a visibility gate, so seeds/corrections may set it.
  // See docs/superpowers/specs/2026-06-07-journey-kb-trust-feedback-design.md.

  it('report reasons match the kb_rule_reports CHECK and resolve in i18n', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { REPORT_REASONS } = require('../utils/reportReasons');
    const allMigrations = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
      .join('\n');
    const check = allMigrations.match(
      /reason\s+text\s+NOT NULL\s+CHECK \(reason IN \(([^)]+)\)\)/i,
    );
    expect(check).toBeTruthy();
    for (const reason of REPORT_REASONS) {
      expect(check?.[0]).toContain(`'${reason}'`);
      expect(typeof resolveKey(en, `smartReminders.report.${reason}`)).toBe('string');
      expect(typeof resolveKey(fr, `smartReminders.report.${reason}`)).toBe('string');
    }
  });

  it('"smart_reminders" is a known notification category', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NOTIFICATION_CATEGORIES } = require('@features/notifications/utils/categories');
    expect(NOTIFICATION_CATEGORIES).toContain('smart_reminders');
  });
});
