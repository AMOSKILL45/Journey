import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const MIGRATIONS = path.join(__dirname, '../../../../supabase/migrations');
const MIG = fs.readFileSync(path.join(MIGRATIONS, '20260604_passport.sql'), 'utf8');
const TYPES = fs.readFileSync(path.join(__dirname, '../../../core/supabase/types.ts'), 'utf8');

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

describe('passport runtime contracts', () => {
  it('every static t("passport.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(full);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          for (const m of fs
            .readFileSync(full, 'utf8')
            .matchAll(/t\(\s*[`'"]passport\.([a-zA-Z0-9_.]+)[`'"]/g)) {
            keys.add(`passport.${m[1]}`);
          }
        }
      }
    };
    walk(FEATURE_DIR);
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('counts interpolation: every var the screen passes has a matching %{var} in en + fr', () => {
    // i18n-js uses %{var}. tsc and key-resolution both miss a placeholder/var-name mismatch —
    // it silently renders a broken count. Scan BOTH sides and assert they agree.
    const screen = fs.readFileSync(path.join(FEATURE_DIR, 'screens/PassportScreen.tsx'), 'utf8');
    const call = screen.match(/t\(\s*['"]passport\.screen\.counts['"]\s*,\s*\{([^}]*)\}/);
    expect(call).toBeTruthy();
    const vars = [...call![1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    expect(vars).toEqual(expect.arrayContaining(['countries', 'stamps']));
    const enCounts = resolveKey(en, 'passport.screen.counts') as string;
    const frCounts = resolveKey(fr, 'passport.screen.counts') as string;
    for (const v of vars) {
      expect(enCounts).toContain(`%{${v}}`);
      expect(frCounts).toContain(`%{${v}}`);
    }
  });

  it('rebuild_my_passport RPC + passport columns exist in the generated types', () => {
    expect(TYPES).toMatch(/rebuild_my_passport/);
    expect(TYPES).toContain('passport_stamps');
    expect(TYPES).toContain('countries_visited');
  });

  it('internal passport functions are revoked from anon + authenticated (not RPC-exposed)', () => {
    for (const fn of ['_rebuild_passport\\(uuid\\)', '_passport_after_checkins\\(\\)']) {
      expect(MIG).toMatch(
        new RegExp(
          `revoke all on function public\\.${fn} from [^;]*\\banon\\b[^;]*\\bauthenticated\\b`,
          'i',
        ),
      );
    }
    expect(MIG).toMatch(
      /revoke all on function public\.rebuild_my_passport\(\) from [^;]*\banon\b/i,
    );
    expect(MIG).toMatch(
      /grant execute on function public\.rebuild_my_passport\(\) to authenticated/i,
    );
  });
});
