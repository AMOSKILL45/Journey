import AsyncStorage from '@react-native-async-storage/async-storage';

import { ONBOARDING_FLAGS_STORAGE_KEY } from '@features/onboarding/store/onboardingFlags';

import { CLEARED_STORAGE_KEYS, clearLocalCaches } from '../utils/clearLocalCaches';

const multiRemove = AsyncStorage.multiRemove as jest.Mock;

function fakeQueryClient(clear: jest.Mock) {
  return { clear } as unknown as Parameters<typeof clearLocalCaches>[0];
}

describe('account/clearLocalCaches', () => {
  beforeEach(() => multiRemove.mockReset().mockResolvedValue(undefined));

  it('clears the query cache and removes the onboarding + settings storage keys', async () => {
    const clear = jest.fn();
    await clearLocalCaches(fakeQueryClient(clear));

    expect(clear).toHaveBeenCalledTimes(1);
    const removed = multiRemove.mock.calls[0][0] as string[];
    // The first-run intro flag MUST be cleared (under the store's REAL persist key) so the next
    // user on this device re-sees onboarding.
    expect(removed).toContain(ONBOARDING_FLAGS_STORAGE_KEY);
    expect(ONBOARDING_FLAGS_STORAGE_KEY).toBe('onboarding.flags.v1');
    for (const key of CLEARED_STORAGE_KEYS) expect(removed).toContain(key);
  });

  it('never throws even if storage removal rejects', async () => {
    multiRemove.mockRejectedValue(new Error('storage down'));
    const clear = jest.fn();
    await expect(clearLocalCaches(fakeQueryClient(clear))).resolves.toBeUndefined();
    expect(clear).toHaveBeenCalled();
  });

  it('swallows a throwing query-cache clear', async () => {
    const clear = jest.fn(() => {
      throw new Error('cache boom');
    });
    await expect(clearLocalCaches(fakeQueryClient(clear))).resolves.toBeUndefined();
    expect(multiRemove).toHaveBeenCalled();
  });
});
