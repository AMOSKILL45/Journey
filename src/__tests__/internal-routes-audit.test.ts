/**
 * Internal navigation routes audit.
 *
 * Complement to deep-links-contract.test.ts. This test scans the entire `src/`
 * tree for in-app navigation calls (`router.push`, `router.replace`,
 * `<Redirect href>`, `<Link href>`) and asserts that every target path
 * resolves to an expo-router screen. Without this, a typo in a path string
 * silently degrades to a +not-found.tsx 404 in production — same failure mode
 * as the auth/callback and invite/[token] bugs from 2026-05-26.
 *
 * Template literals like `\`/(modals)/trip/${trip.id}\`` are normalised to
 * `/(modals)/trip/[id]` and matched against dynamic-segment screen files.
 *
 * Patterns are intentionally syntactic (regex per JSX/call shape) rather than
 * AST-based — keeps the test self-contained and runs in <100ms. Edge cases
 * (multi-line JSX expressions with deeply nested logic) may be missed; add
 * a new pattern below or rely on the deep-link contract + Maestro smoke
 * test to cover them.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');

// Each entry produces 1+ capture groups whose values are candidate route paths.
const PATTERNS: { name: string; regex: RegExp; groups: number[] }[] = [
  // router.push('/path') / router.replace("/path") / router.push(`/path`)
  {
    name: 'router.push',
    regex: /router\.push\(\s*['"`]([^'"`\n]+)['"`]\s*\)/g,
    groups: [1],
  },
  {
    name: 'router.replace',
    regex: /router\.replace\(\s*['"`]([^'"`\n]+)['"`]\s*\)/g,
    groups: [1],
  },
  // router.push({ pathname: '/path', params: ... })
  {
    name: 'router.push (object)',
    regex: /router\.push\(\s*\{[\s\S]{0,200}?\bpathname:\s*['"`]([^'"`\n]+)['"`]/g,
    groups: [1],
  },
  {
    name: 'router.replace (object)',
    regex: /router\.replace\(\s*\{[\s\S]{0,200}?\bpathname:\s*['"`]([^'"`\n]+)['"`]/g,
    groups: [1],
  },
  // <Redirect href="/path" />  (also matches <Redirect href='/path' />)
  {
    name: '<Redirect>',
    regex: /<Redirect\b[\s\S]{0,200}?\bhref=['"]([^'"\n]+)['"]/g,
    groups: [1],
  },
  // <Redirect href={`/path/${x}`} />
  {
    name: '<Redirect>',
    regex: /<Redirect\b[\s\S]{0,200}?\bhref=\{\s*`([^`\n]+)`/g,
    groups: [1],
  },
  // <Redirect href={cond ? '/a' : '/b'} />
  {
    name: '<Redirect>',
    regex:
      /<Redirect\b[\s\S]{0,200}?\bhref=\{[^{}]{1,100}\?\s*['"`]([^'"`\n]+)['"`]\s*:\s*['"`]([^'"`\n]+)['"`]/g,
    groups: [1, 2],
  },
  // <Link href="/path" ...>
  {
    name: '<Link>',
    regex: /<Link\b[\s\S]{0,200}?\bhref=['"]([^'"\n]+)['"]/g,
    groups: [1],
  },
  // <Link href={`/path/${x}`} ...>
  {
    name: '<Link>',
    regex: /<Link\b[\s\S]{0,200}?\bhref=\{\s*`([^`\n]+)`/g,
    groups: [1],
  },
];

interface NavTarget {
  file: string;
  callKind: string;
  target: string;
}

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
    out.push(full);
  }
  return out;
}

function normalizeTemplate(s: string): string {
  // `/(modals)/trip/${trip.id}` → `/(modals)/trip/[id]`
  return s.replace(/\$\{[^}]+\}/g, '[id]');
}

function isRoutePath(s: string): boolean {
  if (!s.startsWith('/')) return false;
  if (s.startsWith('//')) return false;
  if (s.includes('://')) return false;
  return true;
}

function findNavTargets(): NavTarget[] {
  const results: NavTarget[] = [];
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { name: callKind, regex, groups } of PATTERNS) {
      const matches = content.matchAll(regex);
      for (const m of matches) {
        for (const g of groups) {
          const raw = m[g];
          if (!raw) continue;
          if (!isRoutePath(raw)) continue;
          results.push({
            file: path.relative(PROJECT_ROOT, file),
            callKind,
            target: normalizeTemplate(raw),
          });
        }
      }
    }
  }
  return results;
}

function routeExistsForPath(routePath: string): boolean {
  const stripped = routePath.replace(/^\//, '').replace(/\/+$/, '');

  if (!stripped) {
    return fs.existsSync(path.join(APP_DIR, 'index.tsx'));
  }

  for (const ext of ['.tsx', '.ts']) {
    if (fs.existsSync(path.join(APP_DIR, `${stripped}${ext}`))) return true;
  }
  if (fs.existsSync(path.join(APP_DIR, stripped, 'index.tsx'))) return true;
  if (fs.existsSync(path.join(APP_DIR, stripped, 'index.ts'))) return true;
  if (fs.existsSync(path.join(APP_DIR, stripped, '_layout.tsx'))) return true;
  if (fs.existsSync(path.join(APP_DIR, stripped, '_layout.ts'))) return true;

  // Dynamic segment: last segment of the form `[id]` matches any `[*].tsx` in parent dir.
  const segments = stripped.split('/');
  const last = segments[segments.length - 1];
  if (/^\[.+]$/.test(last)) {
    const parent = segments.slice(0, -1).join('/');
    const parentDir = parent ? path.join(APP_DIR, parent) : APP_DIR;
    if (fs.existsSync(parentDir)) {
      return fs.readdirSync(parentDir).some((f) => /^\[.+]\.(tsx|ts)$/.test(f));
    }
  }
  return false;
}

describe('Internal navigation routes audit', () => {
  const all = findNavTargets();
  const seen = new Set<string>();
  const unique: NavTarget[] = [];
  for (const t of all) {
    if (seen.has(t.target)) continue;
    seen.add(t.target);
    unique.push(t);
  }

  it('finds at least one internal navigation call in src/', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  if (unique.length > 0) {
    it.each(unique)(
      '$callKind → $target (first seen in $file) resolves to a screen',
      ({ target }: NavTarget) => {
        const exists = routeExistsForPath(target);
        if (!exists) {
          throw new Error(
            `Internal navigation target "${target}" does not match any screen ` +
              `in src/app/. Add the missing screen file or fix the path.`,
          );
        }
        expect(exists).toBe(true);
      },
    );
  }
});
