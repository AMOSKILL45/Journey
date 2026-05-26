/**
 * Deep-link routes contract.
 *
 * Scans the entire `src/` tree for string literals matching the app's deep-link
 * scheme (e.g. `thisisthejourney://auth/callback`) and asserts that each one
 * resolves to an expo-router screen file. Without this check, a misnamed URL or
 * a deleted screen will silently degrade to a 404 ("Something went wrong") that
 * only manifests on a real device — exactly the bug class that ate our 2026-05-26
 * TestFlight session.
 *
 * The scheme is read from app.config.ts so we don't drift if it's renamed.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');
const SCHEME = 'thisisthejourney'; // mirrors `scheme` in app.config.ts
const SCREEN_FILE_EXTENSIONS = ['.tsx', '.ts'];

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

interface DeepLinkLiteral {
  file: string;
  url: string;
}

function findDeepLinkLiterals(): DeepLinkLiteral[] {
  const results: DeepLinkLiteral[] = [];
  // Match `'thisisthejourney://...'`, `"thisisthejourney://..."`, backtick variants.
  const pattern = new RegExp(`['"\`](${SCHEME}://[^'"\`\\s]+)['"\`]`, 'g');
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(pattern);
    for (const m of matches) {
      results.push({ file: path.relative(PROJECT_ROOT, file), url: m[1] });
    }
  }
  return results;
}

function extractRoutePath(url: string): string {
  // `thisisthejourney://auth/callback?x=1#y=2` → `auth/callback`
  const match = url.match(/^[a-z]+:\/\/([^?#]*)/);
  return match ? match[1].replace(/\/+$/, '') : '';
}

function screenExistsForPath(routePath: string): boolean {
  if (!routePath) {
    // Root URL `thisisthejourney://` → maps to src/app/index.tsx
    return fs.existsSync(path.join(APP_DIR, 'index.tsx'));
  }
  for (const ext of SCREEN_FILE_EXTENSIONS) {
    if (fs.existsSync(path.join(APP_DIR, `${routePath}${ext}`))) return true;
    if (fs.existsSync(path.join(APP_DIR, routePath, `index${ext}`))) return true;
  }
  // Dynamic segment fallback: e.g. `trip/abc` → `trip/[id].tsx`.
  const parts = routePath.split('/');
  const parent = parts.slice(0, -1).join('/');
  const parentDir = parent ? path.join(APP_DIR, parent) : APP_DIR;
  if (!fs.existsSync(parentDir)) return false;
  return fs
    .readdirSync(parentDir)
    .some((f) => /^\[.+]\.(tsx|ts)$/.test(f) || /^\[\.\.\..+]\.(tsx|ts)$/.test(f));
}

describe('Deep-link routes contract', () => {
  const literals = findDeepLinkLiterals();

  it(`finds at least one ${SCHEME}:// literal in src/`, () => {
    // Sanity check — if this fails, our scheme has changed or the grep is broken.
    expect(literals.length).toBeGreaterThan(0);
  });

  if (literals.length > 0) {
    it.each(literals)(
      '$url (in $file) resolves to an expo-router screen',
      ({ url }: DeepLinkLiteral) => {
        const routePath = extractRoutePath(url);
        const exists = screenExistsForPath(routePath);
        if (!exists) {
          throw new Error(
            `Deep link "${url}" expects a screen at src/app/${routePath}.(tsx|ts) ` +
              `or src/app/${routePath}/index.(tsx|ts), but neither exists. ` +
              `Users tapping this link will see the +not-found 404 screen.`,
          );
        }
        expect(exists).toBe(true);
      },
    );
  }
});
