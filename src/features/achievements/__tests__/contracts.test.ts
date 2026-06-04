import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { BADGE_IDS } from '../badges';
import { METRIC_VOCAB } from '../metrics';

const FEATURE_DIR = path.join(__dirname, '..');
const MIGRATIONS = path.join(__dirname, '../../../../supabase/migrations');
const SEED = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_seed.sql'), 'utf8');
const SCHEMA = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_schema.sql'), 'utf8');
const EVAL = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_eval.sql'), 'utf8');
const REVOKE = fs.readFileSync(
  path.join(MIGRATIONS, '20260604_achievements_triggers_revoke.sql'),
  'utf8',
);

const INTERNAL_FNS = [
  '_ach_after_checkins',
  '_ach_after_milestones',
  '_ach_after_trips',
  '_ach_after_invitations',
  '_ach_after_documents',
  '_ach_after_completions',
  '_ach_after_members',
];

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

// Parse seed rows: ('id','name_key','desc_key','sprite_id','rarity','{json}'::jsonb, order)
const rows = [
  ...SEED.matchAll(
    /\('([a-z0-9_]+)',\s*'([^']+)',\s*'([^']+)',\s*'([a-z0-9_]+)',\s*'(common|rare|epic|legendary)',\s*'(\{[^']+\})'/g,
  ),
];

describe('achievements runtime contracts', () => {
  it('seed declares exactly 20 definitions', () => {
    expect(rows.length).toBe(20);
  });

  it('every def name_key + description_key resolves in en and fr', () => {
    for (const [, , nameKey, descKey] of rows) {
      for (const k of [nameKey, descKey]) {
        expect(typeof resolveKey(en, k)).toBe('string');
        expect(typeof resolveKey(fr, k)).toBe('string');
      }
    }
  });

  it('every def sprite_id is declared in BADGE_IDS', () => {
    for (const [, , , , spriteId] of rows) {
      expect(BADGE_IDS as readonly string[]).toContain(spriteId);
    }
  });

  it('every def trigger_rule.metric is in METRIC_VOCAB', () => {
    for (const row of rows) {
      const metric = (JSON.parse(row[6]) as { metric: string }).metric;
      expect(METRIC_VOCAB as readonly string[]).toContain(metric);
    }
  });

  it('METRIC_VOCAB matches the jsonb metric keys defined in the eval migration', () => {
    const inEval = [...EVAL.matchAll(/'([a-z_]+)',\s*\(select/g)].map((m) => m[1]).sort();
    expect([...METRIC_VOCAB].sort()).toEqual(inEval);
  });

  it('rarities used in the seed match the DB CHECK constraint', () => {
    const check = SCHEMA.match(/rarity\s+text\s+not null\s+check \(rarity in \(([^)]+)\)\)/i);
    expect(check).toBeTruthy();
    const dbVals = [...check![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    const used = [...new Set(rows.map((r) => r[5]))];
    used.forEach((r) => expect(dbVals).toContain(r));
  });

  it('user_achievements has no client write policy (RPC-only writes)', () => {
    expect(SCHEMA).not.toMatch(/on public\.user_achievements\s+for (insert|update|delete)/i);
    expect(SCHEMA).toMatch(/ua_select_own/);
  });

  it('internal trigger functions are revoked from anon + authenticated (not RPC-exposed)', () => {
    for (const fn of INTERNAL_FNS) {
      const re = new RegExp(
        `revoke execute on function public\\.${fn}\\(\\) from [^;]*\\banon\\b[^;]*\\bauthenticated\\b`,
        'i',
      );
      expect(REVOKE).toMatch(re);
    }
    // evaluate_achievements: anon revoked, authenticated keeps EXECUTE (it is the client RPC).
    expect(REVOKE).toMatch(
      /revoke execute on function public\.evaluate_achievements\(\) from [^;]*\banon\b/i,
    );
    expect(REVOKE).toMatch(
      /grant execute on function public\.evaluate_achievements\(\) to authenticated/i,
    );
  });

  it('every static t("achievements.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(full);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          for (const m of fs
            .readFileSync(full, 'utf8')
            .matchAll(/t\(\s*[`'"]achievements\.([a-zA-Z0-9_.]+)[`'"]/g)) {
            keys.add(`achievements.${m[1]}`);
          }
        }
      }
    };
    walk(FEATURE_DIR);
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });
});
