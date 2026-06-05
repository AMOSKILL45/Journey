import { throttle, CARAVAN_EVENT } from '@features/caravan/utils/caravanProtocol';

describe('caravan throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('throttles trailing calls to one per window', () => {
    const fn = jest.fn();
    const t = throttle(fn, 250);
    t(1);
    t(2);
    t(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(1); // leading edge fires immediately
    jest.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3); // trailing edge uses latest args
  });

  it('does not fire a trailing call when there were no calls during the window', () => {
    const fn = jest.fn();
    const t = throttle(fn, 100);
    t('a');
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // no trailing — nothing queued
    t('b');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b'); // window reset, leading again
  });
});

describe('caravan wire constant', () => {
  it('exposes a stable event name', () => {
    expect(CARAVAN_EVENT).toBe('caravan');
  });
});
