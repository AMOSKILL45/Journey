/**
 * Env contract for the 10E legal URLs. `@core/env` reads `Constants.expoConfig.extra` and zod-
 * parses it; the two legal URLs must default to safe https placeholders when absent (so the Legal
 * section always renders) and must pass real provided values through. We re-mock expo-constants per
 * case and re-import env in isolation, mirroring how env consumes config at module load.
 */
describe('account/env legal URLs', () => {
  afterEach(() => {
    jest.resetModules();
  });

  function loadEnvWith(extra: Record<string, unknown>): { privacyUrl: string; termsUrl: string } {
    let env!: { privacyUrl: string; termsUrl: string };
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { expoConfig: { extra } },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      env = require('@core/env').env;
    });
    return env;
  }

  const BASE = { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'key' };

  it('falls back to https placeholder URLs when none are provided', () => {
    const env = loadEnvWith(BASE);
    expect(env.privacyUrl).toMatch(/^https:\/\//);
    expect(env.termsUrl).toMatch(/^https:\/\//);
  });

  it('uses provided privacy/terms URLs verbatim', () => {
    const env = loadEnvWith({
      ...BASE,
      privacyUrl: 'https://example.com/p',
      termsUrl: 'https://example.com/t',
    });
    expect(env.privacyUrl).toBe('https://example.com/p');
    expect(env.termsUrl).toBe('https://example.com/t');
  });
});
