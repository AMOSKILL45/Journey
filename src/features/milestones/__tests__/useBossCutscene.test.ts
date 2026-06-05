import { act, renderHook } from '@testing-library/react-native';

import { useBossCutscene } from '../hooks/useBossCutscene';

describe('useBossCutscene', () => {
  it('queues a cutscene only for boss check-ins', () => {
    const { result } = renderHook(() => useBossCutscene());
    act(() => result.current.onCheckin({ id: 'm1', name: 'Castle', is_boss: false }));
    expect(result.current.active).toBeNull();
    act(() => result.current.onCheckin({ id: 'm2', name: 'Bowser', is_boss: true }));
    expect(result.current.active?.name).toBe('Bowser');
    act(() => result.current.dismiss());
    expect(result.current.active).toBeNull();
  });

  it('treats a missing is_boss flag as non-boss', () => {
    const { result } = renderHook(() => useBossCutscene());
    act(() => result.current.onCheckin({ id: 'm3', name: 'Hill' }));
    expect(result.current.active).toBeNull();
  });

  it('keeps the latest boss when a second boss check-in arrives', () => {
    const { result } = renderHook(() => useBossCutscene());
    act(() => result.current.onCheckin({ id: 'm4', name: 'Bowser', is_boss: true }));
    act(() => result.current.onCheckin({ id: 'm5', name: 'Dragon', is_boss: true }));
    expect(result.current.active).toEqual({ id: 'm5', name: 'Dragon' });
  });
});
