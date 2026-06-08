// Mock expo-localization to return a consistent English locale
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

// Mock AsyncStorage for unit tests (no native module available)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo-constants so env validation doesn't fail in CI / unit tests
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'sb_publishable_test_key',
        sentryDsn: undefined,
        posthogApiKey: undefined,
        posthogHost: 'https://us.i.posthog.com',
      },
    },
  },
}));

// Mock expo-haptics — no native module in unit tests (calling it throws "not available on ios").
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock expo-audio — native module absent in unit tests; sound.ts lazy-requires it.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn(), volume: 0, loop: false })),
}));

// DiceBear is ESM (jest-expo doesn't transform it) and its style JSON resolves via the
// package `exports` map — stub both so PixelAvatar's wiring (label, ring) is tested
// without booting the avatar generator. Real SVG output is runtime-only (typecheck
// still validates the real DiceBear types).
jest.mock('@dicebear/core', () => ({
  Avatar: class {
    toString() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    }
  },
}));
jest.mock('@dicebear/styles/adventurer.json', () => ({}), { virtual: true });
