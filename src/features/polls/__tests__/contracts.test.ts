/**
 * Runtime-contract tests for the Polls feature. These fail in CI (not TestFlight):
 *  - every static `t('polls.*')` key resolves in BOTH locales (passes once the
 *    orchestrator merges this feature's i18n staging into the central locales);
 *  - the `polls` notification category exists in the shared categories vocab;
 *  - the `polls` + `poll_votes` tables exist in the generated Supabase types;
 *  - `poll_votes` is in the realtime publication used for live results;
 *  - the upsert conflict target matches the table's primary key.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { NOTIFICATION_CATEGORIES } from '../../notifications/utils/categories';

const FEATURE_DIR = path.join(__dirname, '..');
const SRC_ROOT = path.join(__dirname, '..', '..', '..');
const TYPES = path.join(SRC_ROOT, 'core', 'supabase', 'types.ts');

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

describe('polls runtime contracts', () => {
  it('every static t("polls.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const file of walk(FEATURE_DIR)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/t\(\s*['"`]polls\.([a-zA-Z0-9_.]+)['"`]/g)) {
        keys.add(`polls.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('the "polls" notification category is in the shared vocab', () => {
    expect(NOTIFICATION_CATEGORIES).toContain('polls');
  });

  it('polls + poll_votes tables exist in the generated Supabase types', () => {
    const types = fs.readFileSync(TYPES, 'utf8');
    expect(types).toContain('polls: {');
    expect(types).toContain('poll_votes: {');
    for (const col of ['question', 'options', 'expires_at', 'closed_at', 'option_id']) {
      expect(types).toContain(col);
    }
  });

  it('castVote upserts on the same key the poll_votes PK uses', () => {
    const apiSrc = fs.readFileSync(path.join(FEATURE_DIR, 'api.ts'), 'utf8');
    // poll_votes PK = (poll_id, user_id) → the upsert must conflict-target that pair.
    expect(apiSrc).toMatch(/onConflict:\s*['"]poll_id,user_id['"]/);
  });

  it('the realtime hook subscribes to poll_votes changes (live results)', () => {
    const hook = fs.readFileSync(path.join(FEATURE_DIR, 'hooks/useTripPolls.ts'), 'utf8');
    expect(hook).toMatch(/table:\s*['"]poll_votes['"]/);
    expect(hook).toMatch(/postgres_changes/);
  });

  it('poll_votes write policies require trip membership (no cross-trip vote stuffing)', () => {
    const migrations = path.join(SRC_ROOT, '..', 'supabase', 'migrations');
    const file = fs
      .readdirSync(migrations)
      .find((f) => f.includes('7b_polls') && !f.includes('fix'));
    expect(file).toBeTruthy();
    const sql = fs.readFileSync(path.join(migrations, file ?? ''), 'utf8');
    // Both write policies must gate on is_trip_member — not merely user_id = auth.uid().
    const insert = /create policy votes_insert[^;]*for insert[^;]*;/i.exec(sql)?.[0] ?? '';
    const update = /create policy votes_update[^;]*for update[^;]*;/i.exec(sql)?.[0] ?? '';
    expect(insert).toMatch(/is_trip_member/);
    expect(update).toMatch(/is_trip_member/);
  });
});
