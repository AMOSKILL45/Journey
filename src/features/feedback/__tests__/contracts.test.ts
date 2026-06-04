import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { SOUND_IDS } from '../soundManifest';

const SRC = path.join(__dirname, '../../..');
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

describe('feedback runtime contracts', () => {
  it('declares expo-audio + expo-haptics (expo-audio is lazy-required, so tsc cannot catch removal)', () => {
    const deps = { ...PKG.dependencies, ...PKG.devDependencies };
    expect(deps['expo-audio']).toBeDefined();
    expect(deps['expo-haptics']).toBeDefined();
  });

  it('every static t("feedback.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]feedback\.([a-zA-Z0-9_.]+)[`'"]/g)) {
        keys.add(`feedback.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every playSfx("…") id used in the codebase is a declared SoundId', () => {
    const ids = new Set<string>();
    for (const f of walk(SRC)) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/playSfx\(\s*['"]([a-z_]+)['"]/g)) {
        ids.add(m[1]);
      }
    }
    expect(ids.size).toBeGreaterThan(0);
    ids.forEach((id) => expect(SOUND_IDS as readonly string[]).toContain(id));
  });
});
