/**
 * Verifies that CREDITS.md mentions all license-requiring dependencies.
 * Run via: npm run credits:check
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };

const credits = readFileSync(join(process.cwd(), 'CREDITS.md'), 'utf-8');

const allDeps = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});

// Allowlist: deps we don't need to credit (very common, no required attribution like MIT-only)
const allowlist = new Set([
  'react',
  'react-dom',
  'react-native',
  'typescript',
  '@types/react',
  '@types/jest',
  '@types/node',
  'jest',
  'eslint',
  'prettier',
  'tsx',
  'husky',
  'lint-staged',
  'clsx',
  'tailwind-merge',
  'tailwindcss',
  'zod',
  'zustand',
  '@tanstack/react-query',
  '@tanstack/react-query-persist-client',
  'expo',
  '@babel/core',
]);

const missing: string[] = [];

for (const dep of allDeps) {
  if (allowlist.has(dep)) continue;
  if (dep.startsWith('expo-')) continue;
  if (dep.startsWith('@expo/')) continue;
  if (dep.startsWith('@expo-google-fonts/')) continue;
  if (dep.startsWith('@typescript-eslint/')) continue;
  if (dep.startsWith('eslint-')) continue;
  if (dep.startsWith('react-native-')) continue;
  if (dep.startsWith('babel-')) continue;
  if (dep.startsWith('@testing-library/')) continue;
  if (dep.startsWith('jest-')) continue;

  const baseName = dep.replace(/^@/, '').split('/')[0];
  if (!credits.toLowerCase().includes(baseName.toLowerCase())) {
    missing.push(dep);
  }
}

if (missing.length > 0) {
  console.error('✗ The following dependencies are NOT mentioned in CREDITS.md:');
  for (const m of missing) console.error(`  - ${m}`);
  console.error('\nAdd them to CREDITS.md before merging.');
  process.exit(1);
}

console.log('✓ All notable dependencies are credited.');
