const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'ios/**',
      'android/**',
      '.references/**',
      '**/*.generated.ts',
      'eslint.config.js',
      'supabase/functions/**', // Deno runtime — JSR imports cannot be resolved by Node ESLint
    ],
  },
  ...compat.config({
    root: true,
    extends: ['expo', 'prettier'],
    plugins: ['react-hooks', '@typescript-eslint'],
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    env: {
      node: true,
      'react-native/react-native': true,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
    overrides: [
      {
        files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}', 'jest.*.js'],
        env: {
          jest: true,
          node: true,
        },
        rules: {
          'import/first': 'off',
          'import/order': 'off',
        },
      },
    ],
  }),
];
