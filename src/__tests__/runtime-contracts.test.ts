// Cross-cutting runtime-contract audit (auditing-runtime-contracts skill).
// These assert static→runtime promises that unit tests otherwise mock away: an edge-function name
// the client invokes must map to a deployed function directory; i18n templates must carry the
// interpolation placeholders their call sites pass; a notification category the server inserts must
// be one the client knows. They scan the real source tree — no mocking the boundary.
import fs from 'fs';
import path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import { RANDOM_ENCOUNTER_FN } from '@features/encounters/api';
import { NOTIFICATION_CATEGORIES } from '@features/notifications/utils/categories';

const SRC_DIR = path.join(__dirname, '..');
const REPO_DIR = path.join(__dirname, '..', '..');
const FUNCTIONS_DIR = path.join(REPO_DIR, 'supabase', 'functions');

function deployedFunctionDirs(): string[] {
  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('runtime contracts', () => {
  const deployed = deployedFunctionDirs();

  it('every client edge-function reference maps to a deployed supabase/functions/<name> dir', () => {
    // Constant-based reference (the client invokes via this constant, not a literal):
    expect(deployed).toContain(RANDOM_ENCOUNTER_FN);

    // Any literal invoke call site in production code must also resolve to a deployed dir.
    // (Test files are excluded — their mocks are not production contracts.)
    const invoked = new Set<string>();
    for (const file of sourceFiles(SRC_DIR)) {
      if (file.includes('__tests__')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/functions\.invoke\(\s*['"]([a-zA-Z0-9_-]+)['"]/g)) {
        invoked.add(m[1]);
      }
    }
    for (const name of invoked) {
      expect(deployed).toContain(name);
    }
  });

  it('boss + time-capsule i18n templates carry their interpolation placeholders', () => {
    for (const loc of [en, fr] as const) {
      expect(loc.boss.subtitle).toContain('%{milestone}');
      expect(loc.timeCapsules.opensIn).toContain('%{days}');
    }
  });

  it('the time_capsule notification category is shared by the server cron and the client', () => {
    const cron = fs.readFileSync(
      path.join(FUNCTIONS_DIR, 'time_capsules_cron', 'index.ts'),
      'utf8',
    );
    expect(cron).toContain("'time_capsule'");
    expect(NOTIFICATION_CATEGORIES).toContain('time_capsule');
  });
});
