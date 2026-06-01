import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { LOCATION_SHARING_MODES } from '../api/sharing';
import { tripTopic } from '../utils/channel';

const FEATURE_DIR = path.join(__dirname, '..');

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

describe('realtime runtime contracts', () => {
  it('every static t("realtime.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]realtime\.([a-zA-Z0-9_.${}]+)[`'"]/g)) {
        if (!m[1].includes('${')) keys.add(`realtime.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every location_sharing mode has a realtime.sharing.* label in en and fr', () => {
    for (const m of LOCATION_SHARING_MODES) {
      expect(typeof resolveKey(en, `realtime.sharing.${m}`)).toBe('string');
      expect(typeof resolveKey(fr, `realtime.sharing.${m}`)).toBe('string');
    }
  });

  it('trip topic is trip:{id} and matches the SQL substring(topic from 6) the RLS policy uses', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const topic = tripTopic(id);
    expect(topic).toBe(`trip:${id}`);
    expect(topic.startsWith('trip:')).toBe(true);
    // Postgres `substring(realtime.topic() from 6)` is 1-indexed → strips the 5-char "trip:" prefix.
    expect(topic.substring(5)).toBe(id);
  });
});
