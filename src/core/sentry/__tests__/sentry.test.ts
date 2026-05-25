import { initSentry } from '../index';

describe('Sentry init', () => {
  it('does not throw when DSN is missing', () => {
    expect(() => initSentry()).not.toThrow();
  });
});
