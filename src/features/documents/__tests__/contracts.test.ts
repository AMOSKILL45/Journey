/**
 * Runtime-contract tests for the Documents feature.
 *
 * These assert promises the code makes about runtime state that normal unit
 * tests (which mock the boundary) never verify:
 *  - every static `t('documents.*')` key resolves in en + fr locales,
 *  - the dynamic `documents.category.*` keys exist for every suggested category,
 *  - the typed route pushed from TripDetailScreen has a real screen file,
 *  - the Storage bucket id used by the api matches the one created in the migration.
 *
 * They scan source (no mocks) so drift fails in CI instead of TestFlight.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const SRC_ROOT = path.join(__dirname, '..', '..', '..');
const REPO_ROOT = path.join(SRC_ROOT, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveKey(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

describe('documents runtime contracts', () => {
  const sources = walk(FEATURE_DIR);

  it('every static t("documents.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const file of sources) {
      const content = fs.readFileSync(file, 'utf8');
      for (const match of content.matchAll(/t\(\s*['"`]documents\.([a-zA-Z0-9_.]+)['"`]/g)) {
        keys.add(`documents.${match[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    const missingEn = [...keys].filter((k) => typeof resolveKey(en, k) !== 'string');
    const missingFr = [...keys].filter((k) => typeof resolveKey(fr, k) !== 'string');
    expect(missingEn).toEqual([]);
    expect(missingFr).toEqual([]);
  });

  it('all suggested category keys resolve (dynamic documents.category.*)', () => {
    for (const c of ['tickets', 'lodging', 'insurance', 'visa', 'transport', 'other']) {
      expect(typeof resolveKey(en, `documents.category.${c}`)).toBe('string');
      expect(typeof resolveKey(fr, `documents.category.${c}`)).toBe('string');
    }
  });

  it('the documents route pushed from the app has a real screen file', () => {
    const routeFile = path.join(SRC_ROOT, 'app', '(modals)', 'documents', '[tripId].tsx');
    expect(fs.existsSync(routeFile)).toBe(true);
  });

  it('the Storage bucket id used in the api matches the migration', () => {
    const api = fs.readFileSync(path.join(FEATURE_DIR, 'api', 'documents.ts'), 'utf8');
    const bucket = /const BUCKET = '([^']+)'/.exec(api)?.[1];
    expect(bucket).toBeTruthy();

    const migrationsDir = path.join(REPO_ROOT, 'supabase', 'migrations');
    const migration = fs.readdirSync(migrationsDir).find((f) => f.includes('trip_documents'));
    expect(migration).toBeTruthy();

    const sql = fs.readFileSync(path.join(migrationsDir, migration ?? ''), 'utf8');
    expect(sql).toContain(`'${bucket ?? ''}'`);
  });
});
