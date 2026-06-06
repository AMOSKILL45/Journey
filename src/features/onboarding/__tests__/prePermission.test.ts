import {
  __resetPrePermissionForTests,
  registerPrePermissionHandler,
  requestPrePermission,
} from '../prePermission';

describe('prePermission bridge', () => {
  beforeEach(() => {
    __resetPrePermissionForTests();
  });

  it('fails open (returns true) when no provider is mounted', async () => {
    await expect(requestPrePermission('notifications')).resolves.toBe(true);
  });

  it('relays the request to the registered handler and returns its result', async () => {
    const handler = jest.fn().mockResolvedValue(true);
    registerPrePermissionHandler(handler);
    await expect(requestPrePermission('location')).resolves.toBe(true);
    expect(handler).toHaveBeenCalledWith('location');
  });

  it('returns false when the user declines on the first prompt', async () => {
    registerPrePermissionHandler(jest.fn().mockResolvedValue(false));
    await expect(requestPrePermission('notifications')).resolves.toBe(false);
  });

  it('primes each kind at most once, then defers to the OS (returns true)', async () => {
    const handler = jest.fn().mockResolvedValue(false);
    registerPrePermissionHandler(handler);

    await expect(requestPrePermission('location')).resolves.toBe(false);
    // Second call for the same kind: no re-prompt, returns true (defer to OS).
    await expect(requestPrePermission('location')).resolves.toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('tracks notifications and location independently', async () => {
    const handler = jest.fn().mockResolvedValue(true);
    registerPrePermissionHandler(handler);
    await requestPrePermission('notifications');
    await requestPrePermission('location');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, 'notifications');
    expect(handler).toHaveBeenNthCalledWith(2, 'location');
  });
});
