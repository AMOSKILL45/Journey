/**
 * Runtime-contract tests for the Photos + Reactions feature (7A).
 *
 * These assert promises the code makes about runtime state that mocked unit tests never
 * verify, so drift fails in CI instead of TestFlight:
 *  - every static `t('photos.*' | 'reactions.*')` key resolves in the central en + fr locales,
 *  - the dynamic `reactions.label.<emoji>` keys exist for every REACTION_ID,
 *  - REACTION_IDS exactly equals the `reactions.emoji` DB CHECK set,
 *  - the Storage bucket id used by the api matches the bucket created in the migration,
 *  - the photos modal route the app pushes to has a real screen file.
 */
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { PHOTOS_BUCKET } from '../api';
import { REACTION_IDS } from '../data/reactionSet';

const FEATURE_DIR = path.join(__dirname, '..');
const SRC_ROOT = path.join(__dirname, '..', '..', '..');
const REPO_ROOT = path.join(SRC_ROOT, '..');
const MIGRATIONS = path.join(REPO_ROOT, 'supabase', 'migrations');

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
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function staticKeys(): string[] {
  const keys = new Set<string>();
  for (const file of walk(FEATURE_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/t\(\s*['"`](photos|reactions)\.([a-zA-Z0-9_.]+)['"`]/g)) {
      if (!m[2].includes('${')) keys.add(`${m[1]}.${m[2]}`);
    }
  }
  return [...keys];
}

describe('photos runtime contracts', () => {
  it('finds static photos.*/reactions.* keys in the source', () => {
    expect(staticKeys().length).toBeGreaterThan(0);
  });

  it('every static photos.*/reactions.* key resolves in the central en and fr locales', () => {
    const keys = staticKeys();
    expect(keys.filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect(keys.filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every REACTION_ID has a reactions.label.* string in the central en + fr locales', () => {
    for (const emoji of REACTION_IDS) {
      expect(typeof resolveKey(en, `reactions.label.${emoji}`)).toBe('string');
      expect(typeof resolveKey(fr, `reactions.label.${emoji}`)).toBe('string');
    }
  });

  it('REACTION_IDS exactly equals the reactions.emoji DB CHECK set', () => {
    const migration = fs.readdirSync(MIGRATIONS).find((f) => f.includes('photos_reactions'));
    expect(migration).toBeTruthy();
    const sql = fs.readFileSync(path.join(MIGRATIONS, migration ?? ''), 'utf8');
    const m = sql.match(/emoji[\s\S]*?check\s*\(\s*emoji\s+in\s*\(([^)]+)\)/i);
    expect(m).toBeTruthy();
    const dbValues = [...m![1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    expect([...REACTION_IDS].sort()).toEqual(dbValues);
  });

  it('the Storage bucket id used in the api matches the migration', () => {
    expect(PHOTOS_BUCKET).toBe('trip-photos');
    const api = fs.readFileSync(path.join(FEATURE_DIR, 'api.ts'), 'utf8');
    const bucket = /PHOTOS_BUCKET = '([^']+)'/.exec(api)?.[1];
    expect(bucket).toBe('trip-photos');

    const migration = fs.readdirSync(MIGRATIONS).find((f) => f.includes('photos_reactions'));
    const sql = fs.readFileSync(path.join(MIGRATIONS, migration ?? ''), 'utf8');
    expect(sql).toContain(`'${bucket ?? ''}'`);
  });

  it('the photos route pushed from the app has a real screen file', () => {
    const routeFile = path.join(SRC_ROOT, 'app', '(modals)', 'photos', '[tripId].tsx');
    expect(fs.existsSync(routeFile)).toBe(true);
  });
});
