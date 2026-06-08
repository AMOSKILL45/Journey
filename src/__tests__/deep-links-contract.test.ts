/**
 * Deep-link routes contract.
 *
 * Two layers, because deep links break in two distinct ways that unit tests miss:
 *
 *  (A) LITERAL SCAN — grep `src/` for `thisisthejourney://…` string literals and assert
 *      each resolves to an expo-router screen. Catches a misnamed/deleted screen → 404
 *      ("Something went wrong"), the bug class that ate our 2026-05-26 TestFlight session.
 *
 *  (B) BUILT-OUTPUT EVAL — the link builders assemble URLs from the APP_SCHEME constant
 *      (`${APP_SCHEME}://t/${token}`), so a literal scan CANNOT see them. A bare
 *      `journey://` constant shipped a dead public-share link while every test stayed
 *      green. So we ALSO call each builder and assert its OUTPUT uses the scheme that
 *      `app.config.ts` actually registers, and targets a real route. The scheme is
 *      PARSED from app.config.ts (not hardcoded) so the two sides can't drift.
 */

import * as fs from 'fs';
import * as path from 'path';

import { APP_SCHEME } from '@core/env/scheme';
import { buildPublicTripLink } from '@features/trips/utils/publicLink';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');
const SCREEN_FILE_EXTENSIONS = ['.tsx', '.ts'];

/** The scheme the OS will actually register — read from app.config.ts so it can't drift. */
function registeredScheme(): string {
  const cfg = fs.readFileSync(path.join(PROJECT_ROOT, 'app.config.ts'), 'utf8');
  const match = cfg.match(/scheme:\s*'([^']+)'/);
  if (!match) throw new Error('Could not parse `scheme` from app.config.ts');
  return match[1];
}

const SCHEME = registeredScheme();

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
  const pattern = new RegExp(`['"\`](${SCHEME}://[^'"\`\\s]+)['"\`]`, 'g');
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(pattern)) {
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
    return fs.existsSync(path.join(APP_DIR, 'index.tsx'));
  }
  // Public-trip shorthand: `t/<token>` has no `app/t/` file — parsePublicTripToken
  // (_layout.tsx) rewrites it to the `(public)/trip/<token>` route. Mirror that here.
  if (/^t\/[^/]+$/.test(routePath)) {
    return SCREEN_FILE_EXTENSIONS.some((ext) =>
      fs.existsSync(path.join(APP_DIR, '(public)', 'trip', `[token]${ext}`)),
    );
  }
  for (const ext of SCREEN_FILE_EXTENSIONS) {
    if (fs.existsSync(path.join(APP_DIR, `${routePath}${ext}`))) return true;
    if (fs.existsSync(path.join(APP_DIR, routePath, `index${ext}`))) return true;
  }
  // Dynamic segment fallback: e.g. `invite/abc` → `invite/[token].tsx`.
  const parts = routePath.split('/');
  const parent = parts.slice(0, -1).join('/');
  const parentDir = parent ? path.join(APP_DIR, parent) : APP_DIR;
  if (!fs.existsSync(parentDir)) return false;
  return fs
    .readdirSync(parentDir)
    .some((f) => /^\[.+]\.(tsx|ts)$/.test(f) || /^\[\.\.\..+]\.(tsx|ts)$/.test(f));
}

describe('Deep-link routes contract — literal scan (A)', () => {
  const literals = findDeepLinkLiterals();

  it(`finds at least one ${SCHEME}:// literal in src/`, () => {
    expect(literals.length).toBeGreaterThan(0);
  });

  if (literals.length > 0) {
    it.each(literals)(
      '$url (in $file) resolves to an expo-router screen',
      ({ url }: DeepLinkLiteral) => {
        const routePath = extractRoutePath(url);
        if (!screenExistsForPath(routePath)) {
          throw new Error(
            `Deep link "${url}" expects a screen at src/app/${routePath}.(tsx|ts) ` +
              `or src/app/${routePath}/index.(tsx|ts), but neither exists. ` +
              `Users tapping this link will see the +not-found 404 screen.`,
          );
        }
        expect(screenExistsForPath(routePath)).toBe(true);
      },
    );
  }
});

describe('Deep-link routes contract — built-output eval (B)', () => {
  it('APP_SCHEME equals the scheme registered in app.config.ts', () => {
    // If these drift, every client-built link silently fails to open the app.
    expect(APP_SCHEME).toBe(SCHEME);
  });

  it('buildPublicTripLink output uses the registered scheme and targets the (public) trip route', () => {
    const url = buildPublicTripLink('tok_ABC-123');
    expect(url).toBe(`${SCHEME}://t/tok_ABC-123`);
    // `t/<token>` is rewritten to `(public)/trip/<token>` by parsePublicTripToken (_layout.tsx).
    expect(fs.existsSync(path.join(APP_DIR, '(public)', 'trip', '[token].tsx'))).toBe(true);
  });

  // buildInvitationScheme (members.ts → imports supabase) and AUTH_REDIRECT_URL (auth.ts →
  // imports the google-signin native module) live behind heavy imports; a repo-scanning
  // contract test shouldn't boot the native graph. Assert STATICALLY that each is assembled
  // from APP_SCHEME (so it can't drift from the registered scheme) and that its route exists.
  it('buildInvitationScheme is built from APP_SCHEME and targets the invite route', () => {
    const src = fs.readFileSync(
      path.join(SRC_DIR, 'features', 'trips', 'api', 'members.ts'),
      'utf8',
    );
    expect(src).toMatch(/return\s+`\$\{APP_SCHEME\}:\/\/invite\/\$\{token\}`/);
    expect(screenExistsForPath('invite/x')).toBe(true);
  });

  it('AUTH_REDIRECT_URL is built from APP_SCHEME and targets the auth/callback route', () => {
    const src = fs.readFileSync(path.join(SRC_DIR, 'features', 'auth', 'api', 'auth.ts'), 'utf8');
    expect(src).toMatch(/AUTH_REDIRECT_URL\s*=\s*`\$\{APP_SCHEME\}:\/\/auth\/callback`/);
    expect(screenExistsForPath('auth/callback')).toBe(true);
  });
});
