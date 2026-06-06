import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // The first-run intro flag MUST be cleared so the next user re-sees onboarding.
    expect(removed).toContain('onboarding_intro_seen');
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
