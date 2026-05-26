/**
 * Asset require() contract.
 *
 * Scans the src/ tree for require('./image.png')-style imports of static
 * assets (PNG, JPG, SVG, audio, fonts) and asserts each path resolves to a
 * file on disk. Without this check, a renamed sprite or a typoed world
 * theme path crashes at Metro bundling time on a real device - invisible in
 * Jest because require() of an asset is mocked by jest-expo.
 *
 * Path aliases like @assets/... are resolved against tsconfig.paths.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

const ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.mp3',
  '.wav',
  '.m4a',
  '.ttf',
  '.otf',
]);

const ALIASES: Record<string, string> = {
  '@assets/': 'src/assets/',
};

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
    if (full.includes(path.sep + '__tests__' + path.sep)) continue;
    out.push(full);
  }
  return out;
}

interface AssetRequire {
  file: string;
  spec: string;
}

const REQUIRE_LITERAL = /\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g;

function findAssetRequires(): AssetRequire[] {
  const hits: AssetRequire[] = [];
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PROJECT_ROOT, file);
    for (const m of content.matchAll(REQUIRE_LITERAL)) {
      const spec = m[1];
      const ext = path.extname(spec).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) {
        hits.push({ file: rel, spec });
      }
    }
  }
  return hits;
}

function resolveAsset(fileAbs: string, spec: string): string {
  for (const alias of Object.keys(ALIASES)) {
    if (spec.startsWith(alias)) {
      return path.join(PROJECT_ROOT, ALIASES[alias], spec.slice(alias.length));
    }
  }
  return path.resolve(path.dirname(fileAbs), spec);
}

describe('asset require() contract', () => {
  const hits = findAssetRequires();

  it('finds at least one asset require (sanity check)', () => {
    expect(hits.length).toBeGreaterThan(0);
  });

  it.each(hits)('asset "$spec" referenced from $file exists on disk', ({ file, spec }) => {
    const importingFileAbs = path.join(PROJECT_ROOT, file);
    const resolved = resolveAsset(importingFileAbs, spec);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        'Asset "' +
          spec +
          '" required from ' +
          file +
          ' does not exist on disk. ' +
          'Expected at ' +
          path.relative(PROJECT_ROOT, resolved) +
          '.',
      );
    }
  });
});
