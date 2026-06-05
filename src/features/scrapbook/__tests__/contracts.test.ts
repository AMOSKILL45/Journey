/**
 * Runtime-contract tests for the 7E scrapbook feature.
 *
 * They scan source + migrations (no mocks) so static→runtime drift fails in CI, not TestFlight:
 *  - every static `t('scrapbook.*')` key resolves in the central en + fr locales,
 *  - the staging i18n files cover both locales with the same key set,
 *  - the edge-function slug the client invokes (`generate_scrapbook`) matches a real
 *    `supabase/functions/<slug>/index.ts`, and that function is secret-gated + service-role,
 *  - the storage bucket the client reads/writes (`trip-scrapbooks`) matches the migration,
 *  - the `scrapbooks` table is SELECT-only for members (no client-INSERT policy — server-only),
 *  - no new native dependency is introduced (OTA-safe; reuses 4A expo-file-system + expo-sharing).
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

// The api module imports expo-sharing/expo-file-system at load; their native modules are absent
// in unit tests. Stub them so importing the contract constants below doesn't crash.
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-file-system', () => ({
  File: class {},
  Paths: { cache: { uri: 'file:///cache/' } },
}));

import { GENERATE_SCRAPBOOK_FN, SCRAPBOOKS_BUCKET } from '../api';

const FEATURE_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(__dirname, '../../../..');
const FUNCTIONS_DIR = path.join(REPO_ROOT, 'supabase/functions');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations');
const PKG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && !e.name.startsWith('.')) out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

/** The migration file that creates the `scrapbooks` table + storage policies. */
function scrapbookMigration(): string {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    if (/create table\s+(if not exists\s+)?(public\.)?scrapbooks/i.test(sql)) return sql;
  }
  throw new Error('No migration creates the scrapbooks table');
}

describe('scrapbook runtime contracts', () => {
  it('every static t("scrapbook.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]scrapbook\.([a-zA-Z0-9_.]+)[`'"]/g)) {
        keys.add(`scrapbook.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    // Passes once the orchestrator merges i18n.{en,fr}.json into the central locales.
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('scrapbook namespace covers both central locales with the same key set', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object'
          ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      );

    const enKeys = flatten((en as Record<string, Record<string, unknown>>).scrapbook ?? {}).sort();
    const frKeys = flatten((fr as Record<string, Record<string, unknown>>).scrapbook ?? {}).sort();
    expect(enKeys.length).toBeGreaterThan(0);
    expect(enKeys).toEqual(frKeys);
  });

  it('the client invoke slug matches a deployed edge-function directory', () => {
    const apiSrc = fs.readFileSync(path.join(FEATURE_DIR, 'api.ts'), 'utf8');
    const invoked = [
      ...apiSrc.matchAll(/functions\.invoke<[^>]*>\(\s*([A-Z_]+|['"][^'"]+['"])/g),
    ].map((m) => m[1]);
    // The api invokes via the GENERATE_SCRAPBOOK_FN constant.
    expect(invoked).toContain('GENERATE_SCRAPBOOK_FN');
    expect(GENERATE_SCRAPBOOK_FN).toBe('generate_scrapbook');
    expect(fs.existsSync(path.join(FUNCTIONS_DIR, GENERATE_SCRAPBOOK_FN, 'index.ts'))).toBe(true);
  });

  it('the edge function is secret-gated + service-role like the existing crons', () => {
    const fn = fs.readFileSync(path.join(FUNCTIONS_DIR, GENERATE_SCRAPBOOK_FN, 'index.ts'), 'utf8');
    expect(fn).toContain('x-webhook-secret');
    expect(fn).toContain('verify_webhook_secret');
    expect(fn).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('the edge function inserts into scrapbooks and uploads a pdf to the right bucket', () => {
    const fn = fs.readFileSync(path.join(FUNCTIONS_DIR, GENERATE_SCRAPBOOK_FN, 'index.ts'), 'utf8');
    expect(fn).toMatch(/from\(\s*['"]scrapbooks['"]\s*\)\s*\.insert/);
    expect(fn).toContain('trip-scrapbooks');
  });

  it('the client bucket constant matches the bucket created in the migration', () => {
    expect(SCRAPBOOKS_BUCKET).toBe('trip-scrapbooks');
    const sql = scrapbookMigration();
    expect(sql).toContain("'trip-scrapbooks'");
  });

  it('the scrapbooks table is members-SELECT only (no client INSERT/UPDATE/DELETE policy)', () => {
    const sql = scrapbookMigration();
    expect(sql).toMatch(/create policy[^;]*scrapbooks[^;]*for select/i);
    // Anti-cheat: rows are written by the edge fn (service role). No write policy may exist.
    expect(sql).not.toMatch(/create policy[^;]*on\s+(public\.)?scrapbooks[^;]*for insert/i);
    expect(sql).not.toMatch(/create policy[^;]*on\s+(public\.)?scrapbooks[^;]*for update/i);
    expect(sql).not.toMatch(/create policy[^;]*on\s+(public\.)?scrapbooks[^;]*for delete/i);
  });

  it('introduces no new native dependency (reuses 4A expo-file-system + expo-sharing)', () => {
    const deps = { ...PKG.dependencies, ...PKG.devDependencies };
    expect(deps['expo-file-system']).toBeDefined();
    expect(deps['expo-sharing']).toBeDefined();
    // pdf-lib runs in the Deno edge function (esm.sh import), never bundled into the app.
    expect(deps['pdf-lib']).toBeUndefined();
  });
});
