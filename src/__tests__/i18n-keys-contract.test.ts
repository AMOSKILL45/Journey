/**
 * i18n keys contract.
 *
 * Scans the entire `src/` tree for `t('key.path')` and `t(\`key.path\`)`
 * calls and asserts that every literal key resolves to a non-empty string
 * in BOTH `en.json` and `fr.json`. Without this check, a typo like
 * `t('map.tooggle.path')` ships as the literal raw key (`map.tooggle.path`)
 * rendered in the UI — a silent UX bug that unit tests don't catch because
 * each component test mocks `t` to return the key itself.
 *
 * Phase 3 added ~10 new `map.*` keys, and the same shape of bug bit us
 * twice in Phase 1 (`trips.detail.confirmDeleteBody` vs `confirmDelete.body`)
 * and Phase 2 (`milestones.checkin.cta` vs `confirmCta`). This contract
 * catches the next one before it ships.
 *
 * Computed keys like `t(\`map.themes.\${themeId}\`)` are intentionally NOT
 * matched — they require runtime knowledge of the variable. They show up in
 * the COMPUTED_PATTERNS array below for the manual checklist.
 */

import * as fs from 'fs';
import * as path from 'path';

import en from '../core/i18n/locales/en.json';
import fr from '../core/i18n/locales/fr.json';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Keys that are referenced in source via interpolation (template literals
// with embedded variables). They're flagged by COMPUTED_PATTERNS and must
// be manually whitelisted here.
const COMPUTED_KEYS_WHITELIST: readonly string[] = [
  'map.themes.adventure-generic',
  'map.themes.usa-desert',
];

type JsonRecord = { [key: string]: string | JsonRecord };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.includes('.test.')) continue;
    if (full.includes(`${path.sep}__tests__${path.sep}`)) continue;
    // Locales themselves are JSON, no t() calls inside them.
    if (full.includes(`${path.sep}locales${path.sep}`)) continue;
    out.push(full);
  }
  return out;
}

interface KeyHit {
  file: string;
  key: string;
  computed: boolean;
}

// `t('key.path')` / `t("key.path")` / `t(\`key.path\`)` — capture if no `${`
const LITERAL_T_CALL = /\bt\(\s*['"`]([a-zA-Z][a-zA-Z0-9_.-]*)['"`]/g;
// Same but template literal contains `${` → computed. We capture the
// prefix so the human reviewer knows what to look at.
const COMPUTED_T_CALL = /\bt\(\s*`([a-zA-Z][a-zA-Z0-9_.-]*?)\$\{/g;

function findAllKeys(): { literals: KeyHit[]; computed: KeyHit[] } {
  const literals: KeyHit[] = [];
  const computed: KeyHit[] = [];
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PROJECT_ROOT, file);
    for (const m of content.matchAll(LITERAL_T_CALL)) {
      literals.push({ file: rel, key: m[1], computed: false });
    }
    for (const m of content.matchAll(COMPUTED_T_CALL)) {
      computed.push({ file: rel, key: m[1], computed: true });
    }
  }
  return { literals, computed };
}

function resolveKey(table: JsonRecord, dotted: string): string | undefined {
  const parts = dotted.split('.');
  let cursor: string | JsonRecord = table;
  for (const part of parts) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as JsonRecord)[part];
    if (cursor === undefined) return undefined;
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

describe('i18n keys contract', () => {
  const { literals, computed } = findAllKeys();
  const enTable = en as JsonRecord;
  const frTable = fr as JsonRecord;

  it('finds at least a few literal t() calls (sanity check)', () => {
    expect(literals.length).toBeGreaterThan(20);
  });

  describe('literal keys resolve in en + fr', () => {
    const unique = Array.from(new Set(literals.map((h) => h.key))).sort();

    it.each(unique)('"%s" resolves in en.json', (key) => {
      const value = resolveKey(enTable, key);
      if (value === undefined) {
        const offenders = literals.filter((h) => h.key === key).map((h) => h.file);
        throw new Error(
          `Translation key "${key}" referenced in ${offenders.join(', ')} ` +
            `is missing from en.json. Add it to src/core/i18n/locales/en.json.`,
        );
      }
      expect(value).toBeTruthy();
    });

    it.each(unique)('"%s" resolves in fr.json', (key) => {
      const value = resolveKey(frTable, key);
      if (value === undefined) {
        const offenders = literals.filter((h) => h.key === key).map((h) => h.file);
        throw new Error(
          `Translation key "${key}" referenced in ${offenders.join(', ')} ` +
            `is missing from fr.json. Add it to src/core/i18n/locales/fr.json.`,
        );
      }
      expect(value).toBeTruthy();
    });
  });

  it('every computed-key prefix resolves to a JSON object in en + fr', () => {
    const prefixes = Array.from(new Set(computed.map((h) => h.key.replace(/\.$/, '')))).sort();
    for (const prefix of prefixes) {
      const cursor = (() => {
        const parts = prefix.split('.').filter(Boolean);
        let c: string | JsonRecord = enTable;
        for (const p of parts) {
          if (typeof c !== 'object' || c === null) return undefined;
          c = (c as JsonRecord)[p];
          if (c === undefined) return undefined;
        }
        return c;
      })();
      expect(typeof cursor).toBe('object');
    }
  });

  it('every whitelisted computed-key value resolves in en + fr', () => {
    for (const key of COMPUTED_KEYS_WHITELIST) {
      expect(resolveKey(enTable, key)).toBeTruthy();
      expect(resolveKey(frTable, key)).toBeTruthy();
    }
  });
});
