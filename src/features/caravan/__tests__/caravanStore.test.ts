import { caravanReducer, initialCaravan } from '@features/caravan/utils/caravanProtocol';
import { useCaravanStore } from '@features/caravan/store/caravanStore';

describe('caravanReducer', () => {
  it('transitions roles correctly', () => {
    let s = initialCaravan();
    expect(s.role).toBe('off');
    s = caravanReducer(s, { type: 'lead', selfId: 'u1' });
    expect(s).toEqual({ role: 'leading', leaderId: 'u1' });
    s = caravanReducer(s, { type: 'follow', leaderId: 'u2' });
    expect(s).toEqual({ role: 'following', leaderId: 'u2' });
    s = caravanReducer(s, { type: 'leave' });
    expect(s.role).toBe('off');
    expect(s.leaderId).toBeNull();
  });

  it('resets followers when the leader they follow leaves', () => {
    const following = { role: 'following' as const, leaderId: 'u2' };
    expect(caravanReducer(following, { type: 'leaderGone', leaderId: 'u2' }).role).toBe('off');
    // a different leader leaving does not affect us
    expect(caravanReducer(following, { type: 'leaderGone', leaderId: 'u9' })).toEqual(following);
  });

  it('ignores leaderGone while leading or off', () => {
    const leading = { role: 'leading' as const, leaderId: 'u1' };
    expect(caravanReducer(leading, { type: 'leaderGone', leaderId: 'u1' })).toEqual(leading);
    const off = initialCaravan();
    expect(caravanReducer(off, { type: 'leaderGone', leaderId: 'u1' })).toEqual(off);
  });
});

describe('useCaravanStore', () => {
  beforeEach(() => {
    useCaravanStore.getState().dispatch({ type: 'leave' });
  });

  it('starts off', () => {
    expect(useCaravanStore.getState().role).toBe('off');
    expect(useCaravanStore.getState().leaderId).toBeNull();
  });

  it('applies actions through dispatch', () => {
    useCaravanStore.getState().dispatch({ type: 'lead', selfId: 'me' });
    expect(useCaravanStore.getState().role).toBe('leading');
    expect(useCaravanStore.getState().leaderId).toBe('me');

    useCaravanStore.getState().dispatch({ type: 'follow', leaderId: 'boss' });
    expect(useCaravanStore.getState().role).toBe('following');
    expect(useCaravanStore.getState().leaderId).toBe('boss');

    useCaravanStore.getState().dispatch({ type: 'leaderGone', leaderId: 'boss' });
    expect(useCaravanStore.getState().role).toBe('off');
  });
});
