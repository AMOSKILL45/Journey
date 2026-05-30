/**
 * Runtime-contract tests for the Checklists feature: static `t('checklists.*')` keys
 * resolve in both locales, the typed route file exists, and every seeded template id
 * has i18n name coverage. Scans source (no mocks) so drift fails in CI.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const SRC_ROOT = path.join(__dirname, '..', '..', '..');

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

describe('checklists runtime contracts', () => {
  it('every static t("checklists.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const file of walk(FEATURE_DIR)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/t\(\s*['"`]checklists\.([a-zA-Z0-9_.]+)['"`]/g)) {
        keys.add(`checklists.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('the checklist route file exists', () => {
    const routeFile = path.join(SRC_ROOT, 'app', '(modals)', 'checklist', '[tripId].tsx');
    expect(fs.existsSync(routeFile)).toBe(true);
  });

  it('every seeded template has name + items i18n coverage', () => {
    // Mirrors the migration seed (templates + item keys). Keep in sync if templates change.
    const templates: Record<string, string[]> = {
      international: [
        'passport',
        'visa',
        'insurance',
        'flights',
        'accommodation',
        'adapter',
        'bank',
      ],
      beachSun: ['sunscreen', 'swimwear', 'accommodation', 'snorkel', 'aftersun'],
      cityBreak: ['transit', 'shoes', 'museums', 'restaurants', 'offlineMap'],
      roadTrip: ['license', 'rentCar', 'insurance', 'playlist', 'snacks', 'stops'],
    };
    for (const [base, items] of Object.entries(templates)) {
      expect(typeof resolveKey(en, `checklists.templates.${base}.name`)).toBe('string');
      expect(typeof resolveKey(fr, `checklists.templates.${base}.name`)).toBe('string');
      for (const it of items) {
        expect(typeof resolveKey(en, `checklists.templates.${base}.items.${it}`)).toBe('string');
        expect(typeof resolveKey(fr, `checklists.templates.${base}.items.${it}`)).toBe('string');
      }
    }
  });
});
