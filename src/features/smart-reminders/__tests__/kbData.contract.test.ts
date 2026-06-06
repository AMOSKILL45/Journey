/**
 * KB data runtime contract (auditing-runtime-contracts).
 *
 * The smart_reminders_cron edge function matches `country_requirements` rows against
 * trips. Several columns are static assertions about runtime behaviour that NO unit
 * test verifies — they only "break" by silently never matching in production:
 *
 *  - `destination_regions` tokens MUST be keys in the cron's REGIONS map. A typo
 *    (`schengen_zone`) makes `REGIONS[token] ?? []` empty → the rule never fires.
 *    This is a migration ↔ edge-function contract: we parse REGIONS from the cron
 *    source so the two stay in sync.
 *  - `requirement_type` has NO database CHECK (only a comment) → a typo is accepted
 *    by Postgres but can break client rendering/filtering.
 *  - `severity` has a DB CHECK, but it only fires at apply-time; this catches a typo
 *    statically, before the prod migration.
 *  - country codes must be ISO alpha-2 (the cron compares them to trip
 *    destination_country / profiles.passport_country, both ISO alpha-2).
 *  - every row needs >=1 source_url (KB policy — human verification needs a source).
 *
 * Scans ALL `*country_requirements*.sql` migrations, so rules added later are gated too.
 */
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../../../../supabase/migrations');
const CRON = path.join(__dirname, '../../../../supabase/functions/smart_reminders_cron/index.ts');

const REQUIREMENT_TYPES = new Set([
  'visa',
  'eta',
  'vaccine',
  'passport_validity',
  'cash_declaration',
  'insurance',
  'other',
]);
const SEVERITIES = new Set(['mandatory', 'strongly_recommended', 'recommended', 'good_to_know']);
const ISO_ALPHA2 = /^[A-Z]{2}$/;

function kbMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /country_requirements.*\.sql$/.test(f))
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

/** REGIONS keys defined in the cron edge function — the runtime authority. */
function cronRegionKeys(): Set<string> {
  const src = fs.readFileSync(CRON, 'utf8');
  const block = src.match(/const REGIONS[^{]*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('REGIONS map not found in smart_reminders_cron');
  const keys = [...block[1].matchAll(/^\s*([a-z0-9_]+)\s*:/gm)].map((m) => m[1]);
  return new Set(keys);
}

/** Split a string by top-level commas, ignoring commas inside '…' or {…}. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (const ch of s) {
    if (inStr) {
      cur += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
    } else if (ch === '{' || ch === '(') {
      depth += 1;
      cur += ch;
    } else if (ch === '}' || ch === ')') {
      depth -= 1;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Extract top-level `(…)` tuples from a VALUES block. */
function splitTuples(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (const ch of s) {
    if (inStr) {
      cur += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      if (depth >= 1) cur += ch;
    } else if (ch === '(') {
      depth += 1;
      if (depth > 1) cur += ch;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    } else if (depth >= 1) {
      cur += ch;
    }
  }
  return out;
}

interface ParsedRule {
  file: string;
  cols: Record<string, string>;
}

function parseRules(): ParsedRule[] {
  const rules: ParsedRule[] = [];
  for (const file of kbMigrationFiles()) {
    const sql = fs.readFileSync(file, 'utf8');
    const inserts = sql.matchAll(
      /INSERT\s+INTO\s+public\.country_requirements\s*\(([\s\S]*?)\)\s*VALUES([\s\S]*?);/gi,
    );
    for (const ins of inserts) {
      const cols = ins[1].split(',').map((c) => c.trim());
      const valuesBlock = ins[2].split(/ON\s+CONFLICT/i)[0];
      for (const tuple of splitTuples(valuesBlock)) {
        const vals = splitTopLevel(tuple).map((v) => v.trim());
        if (vals.length !== cols.length) {
          throw new Error(
            `${path.basename(file)}: parsed ${vals.length} values for ${cols.length} columns in tuple: ${tuple.slice(0, 80)}`,
          );
        }
        const rec: Record<string, string> = {};
        cols.forEach((c, i) => (rec[c] = vals[i]));
        rules.push({ file: path.basename(file), cols: rec });
      }
    }
  }
  return rules;
}

function unquote(v: string): string {
  const t = v.trim();
  return t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1) : t;
}
function pgArray(v: string): string[] {
  const t = unquote(v).trim();
  const inner = t.replace(/^\{/, '').replace(/\}$/, '');
  return inner
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

describe('KB country_requirements data contract', () => {
  const rules = parseRules();
  const regions = cronRegionKeys();

  it('parses every seeded rule (sanity)', () => {
    expect(rules.length).toBeGreaterThanOrEqual(30);
  });

  it('every destination_regions token is a key in the cron REGIONS map', () => {
    const offenders: string[] = [];
    for (const r of rules) {
      if (r.cols.destination_regions === undefined) continue;
      for (const token of pgArray(r.cols.destination_regions)) {
        if (!regions.has(token)) offenders.push(`${r.cols.id ?? '?'}:${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every requirement_type is in the allowed set', () => {
    const offenders = rules
      .filter((r) => r.cols.requirement_type !== undefined)
      .filter((r) => !REQUIREMENT_TYPES.has(unquote(r.cols.requirement_type)))
      .map((r) => `${unquote(r.cols.id)}:${unquote(r.cols.requirement_type)}`);
    expect(offenders).toEqual([]);
  });

  it('every severity is in the allowed set', () => {
    const offenders = rules
      .filter((r) => r.cols.severity !== undefined)
      .filter((r) => !SEVERITIES.has(unquote(r.cols.severity)))
      .map((r) => `${unquote(r.cols.id)}:${unquote(r.cols.severity)}`);
    expect(offenders).toEqual([]);
  });

  it('destination_country is NULL or ISO alpha-2', () => {
    const offenders = rules
      .filter((r) => r.cols.destination_country !== undefined)
      .map((r) => ({ id: unquote(r.cols.id), dc: unquote(r.cols.destination_country) }))
      .filter((x) => x.dc !== 'NULL' && !ISO_ALPHA2.test(x.dc))
      .map((x) => `${x.id}:${x.dc}`);
    expect(offenders).toEqual([]);
  });

  it('passport country codes are ISO alpha-2', () => {
    const offenders: string[] = [];
    for (const r of rules) {
      for (const col of ['applies_to_passport_countries', 'excluded_passport_countries']) {
        if (r.cols[col] === undefined) continue;
        for (const code of pgArray(r.cols[col])) {
          if (!ISO_ALPHA2.test(code)) offenders.push(`${unquote(r.cols.id)}:${col}:${code}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every rule has at least one source_url', () => {
    const offenders = rules
      .filter((r) => r.cols.source_urls !== undefined)
      .filter((r) => pgArray(r.cols.source_urls).length === 0)
      .map((r) => unquote(r.cols.id));
    expect(offenders).toEqual([]);
  });
});
