import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../package.json'), 'utf8'),
) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

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

describe('calendar-export runtime contracts', () => {
  it('every static t("calendarExport.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]calendarExport\.([a-zA-Z0-9_.]+)[`'"]/g)) {
        keys.add(`calendarExport.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    // Passes once the orchestrator merges i18n.{en,fr}.json into the central locales.
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('calendarExport namespace covers both central locales with the same key set', () => {
    const enKeys = Object.keys(
      (en as Record<string, Record<string, unknown>>).calendarExport ?? {},
    ).sort();
    const frKeys = Object.keys(
      (fr as Record<string, Record<string, unknown>>).calendarExport ?? {},
    ).sort();
    expect(enKeys.length).toBeGreaterThan(0);
    expect(enKeys).toEqual(frKeys);
  });

  it('introduces no new native dependency (expo-print absent)', () => {
    const deps = { ...PKG.dependencies, ...PKG.devDependencies };
    expect(deps['expo-print']).toBeUndefined();
  });

  it('reuses the existing Phase 4A native deps (expo-file-system + expo-sharing)', () => {
    const deps = { ...PKG.dependencies, ...PKG.devDependencies };
    expect(deps['expo-file-system']).toBeDefined();
    expect(deps['expo-sharing']).toBeDefined();
  });
});
