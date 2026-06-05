/**
 * Runtime-contract tests for the 7C enrichment feature.
 *
 * These assert promises the code makes about runtime state that mocked unit tests never verify:
 *  - every static `t('weather.*' | 'distance.*')` key resolves in en + fr,
 *  - the edge-function slug the client invokes matches a real `supabase/functions/<slug>/`,
 *  - every weather sprite id returned by the mapping exists in the milestone sprite manifest,
 *  - the client api never WRITES the cache tables (cache integrity — service role only).
 *
 * They scan source (no mocks) so drift fails in CI, not in TestFlight.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { MILESTONE_SPRITES } from '@assets/sprites/milestones/manifest';

import { WEATHER_CONDITIONS, weatherCodeToIcon } from '../utils/weather';

const FEATURE_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(FEATURE_DIR, '..', '..', '..');
const FUNCTIONS_DIR = path.join(REPO_ROOT, 'supabase', 'functions');
const EDGE_SLUG = 'enrich_milestone';

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
  return key
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      obj,
    );
}

describe('enrichment runtime contracts', () => {
  const sourceFiles = walk(FEATURE_DIR);

  it('every static t("weather.*"|"distance.*") key resolves in en + fr', () => {
    const keys = new Set<string>();
    for (const file of sourceFiles) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/t\(\s*[`'"]((?:weather|distance)\.[a-zA-Z0-9_.]+)[`'"]/g)) {
        keys.add(m[1]);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every weather condition label + temperature key exists in en + fr', () => {
    const required = [...WEATHER_CONDITIONS, 'temperature'].map((k) => `weather.${k}`);
    for (const k of required) {
      expect(typeof resolveKey(en, k)).toBe('string');
      expect(typeof resolveKey(fr, k)).toBe('string');
    }
    expect(typeof resolveKey(en, 'distance.legLabel')).toBe('string');
    expect(typeof resolveKey(fr, 'distance.legLabel')).toBe('string');
  });

  it('the legLabel interpolation vars (%{distance} %{duration}) are present in both locales', () => {
    for (const locale of [en, fr]) {
      const tpl = resolveKey(locale, 'distance.legLabel') as string;
      expect(tpl).toContain('%{distance}');
      expect(tpl).toContain('%{duration}');
    }
    for (const locale of [en, fr]) {
      expect(resolveKey(locale, 'weather.temperature') as string).toContain('%{value}');
    }
  });

  it('the client invoke slug matches a deployed edge function directory', () => {
    const apiSrc = fs.readFileSync(path.join(FEATURE_DIR, 'api.ts'), 'utf8');
    const invoked = [...apiSrc.matchAll(/functions\.invoke<[^>]*>\(\s*['"]([^'"]+)['"]/g)].map(
      (m) => m[1],
    );
    expect(invoked).toContain(EDGE_SLUG);
    expect(fs.existsSync(path.join(FUNCTIONS_DIR, EDGE_SLUG, 'index.ts'))).toBe(true);
  });

  it('the edge function is secret-gated like the existing crons', () => {
    const fn = fs.readFileSync(path.join(FUNCTIONS_DIR, EDGE_SLUG, 'index.ts'), 'utf8');
    expect(fn).toContain('x-webhook-secret');
    expect(fn).toContain('verify_webhook_secret');
    expect(fn).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('every weather sprite id is present in the milestone sprite manifest', () => {
    const ids = new Set(MILESTONE_SPRITES.map((s) => s.id));
    for (const c of WEATHER_CONDITIONS) {
      const code = c === 'clear' ? 0 : c === 'rain' ? 63 : c === 'snow' ? 73 : 2;
      const id = weatherCodeToIcon(code);
      expect(ids.has(id)).toBe(true);
    }
  });

  it('the client api never writes the cache tables (service-role only)', () => {
    const apiSrc = fs.readFileSync(path.join(FEATURE_DIR, 'api.ts'), 'utf8');
    for (const table of ['weather_cache', 'milestone_legs']) {
      for (const writer of ['insert', 'upsert', 'update', 'delete']) {
        // e.g. .from('weather_cache')...insert( — assert no such write chain exists in source.
        const re = new RegExp(`from\\(\\s*['"]${table}['"]\\s*\\)[\\s\\S]{0,80}\\.${writer}\\(`);
        expect(apiSrc).not.toMatch(re);
      }
    }
  });
});
