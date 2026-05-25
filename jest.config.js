module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.references/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|@sentry/.*|native-base|react-native-svg|react-native-url-polyfill|nativewind|@supabase/.*|@tanstack/.*|posthog-react-native|posthog-core))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    // jest-expo@54 + react-native 0.76: setup.js reads .default which doesn't exist in RN mock.
    // Redirect to our augmented mock that includes .default.
    '^react-native/Libraries/BatchedBridge/NativeModules$': '<rootDir>/jest.native-modules-mock.js',
  },
};
