import { initPostHog, track } from '../index';

describe('PostHog', () => {
  it('initializes without throwing when key missing', async () => {
    await expect(initPostHog()).resolves.not.toThrow();
  });

  it('track is a no-op when not initialized', () => {
    expect(() => track('test_event', { foo: 'bar' as string })).not.toThrow();
  });
});
