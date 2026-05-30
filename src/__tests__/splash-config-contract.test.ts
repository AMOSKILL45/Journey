/**
 * Splash config runtime contract.
 *
 * app.config.ts references native assets as plain string paths and sets the
 * native splash `imageWidth`. Neither is exercised by Jest (string paths are
 * invisible to the require()-based asset contract) nor by `tsc` — a typoed path
 * or a drifted size only surfaces at `eas build` / on device. These static
 * checks assert the contract holds in CI instead of on TestFlight.
 *
 * No boundary is mocked: paths are resolved against the real filesystem and the
 * sizes are read from the real source files.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_CONFIG = path.join(PROJECT_ROOT, 'app.config.ts');
const ANIMATED_SPLASH = path.join(
  PROJECT_ROOT,
  'src/features/splash/components/AnimatedSplash.tsx',
);

// Matches `'./some/asset.png'` style relative asset paths in the config source.
const ASSET_PATH_LITERAL = /['"](\.\/[^'"]+\.(?:png|jpg|jpeg|gif|webp))['"]/g;

describe('app.config asset path contract', () => {
  const source = fs.readFileSync(APP_CONFIG, 'utf8');
  const assetPaths = [...new Set([...source.matchAll(ASSET_PATH_LITERAL)].map((m) => m[1]))];

  it('finds asset path literals in app.config.ts (sanity check)', () => {
    expect(assetPaths.length).toBeGreaterThan(0);
  });

  it.each(assetPaths)('app.config asset "%s" exists on disk', (rel) => {
    const resolved = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `app.config.ts references "${rel}" which does not exist at ` +
          `${path.relative(PROJECT_ROOT, resolved)}.`,
      );
    }
  });

  it('points the native splash at the mountain launch icon', () => {
    expect(source).toMatch(/image:\s*['"]\.\/src\/assets\/images\/launch-icon\.png['"]/);
  });
});

describe('splash native/JS size-sync contract', () => {
  it('native splash imageWidth equals the JS overlay ICON_WIDTH', () => {
    const config = fs.readFileSync(APP_CONFIG, 'utf8');
    const overlay = fs.readFileSync(ANIMATED_SPLASH, 'utf8');

    const imageWidth = config.match(/imageWidth:\s*(\d+)/);
    const iconWidth = overlay.match(/ICON_WIDTH\s*=\s*(\d+)/);

    expect(imageWidth).not.toBeNull();
    expect(iconWidth).not.toBeNull();

    // If these drift, the native splash hands off to the JS overlay with a size
    // jump — the exact ugliness this redesign set out to remove.
    expect(Number(imageWidth?.[1])).toBe(Number(iconWidth?.[1]));
  });
});
