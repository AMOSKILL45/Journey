import { hasSeenIntro, markIntroSeen, useOnboardingFlags } from '../store/onboardingFlags';

describe('onboardingFlags store', () => {
  beforeEach(() => {
    useOnboardingFlags.setState({ introSeen: false, hydrated: false });
  });

  it('defaults to intro NOT seen and not hydrated', () => {
    expect(hasSeenIntro()).toBe(false);
    expect(useOnboardingFlags.getState().hydrated).toBe(false);
  });

  it('markIntroSeen flips the persisted flag', () => {
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
    expect(useOnboardingFlags.getState().introSeen).toBe(true);
  });

  it('markIntroSeen is idempotent', () => {
    markIntroSeen();
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });

  it('setHydrated toggles the hydration gate flag', () => {
    useOnboardingFlags.getState().setHydrated(true);
    expect(useOnboardingFlags.getState().hydrated).toBe(true);
  });
});
