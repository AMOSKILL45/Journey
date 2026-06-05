import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { photosQueryKey } from '../hooks/useTripPhotos';
import { reactionsQueryKey, usePhotoReactions } from '../hooks/usePhotoReactions';

const mockChannelObj = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

jest.mock('@core/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => mockChannelObj),
    removeChannel: jest.fn(),
  },
}));

const mockListReactions = jest.fn();
const mockToggleReaction = jest.fn();
jest.mock('../api', () => ({
  listReactions: (...a: unknown[]) => mockListReactions(...a),
  toggleReaction: (...a: unknown[]) => mockToggleReaction(...a),
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

describe('photos query keys', () => {
  it('photosQueryKey is stable and milestone-scoped', () => {
    expect(photosQueryKey('t1')).toEqual(['photos', 't1', null]);
    expect(photosQueryKey('t1', 'm1')).toEqual(['photos', 't1', 'm1']);
  });

  it('reactionsQueryKey is [reactions, type, id]', () => {
    expect(reactionsQueryKey('photo', 'p1')).toEqual(['reactions', 'photo', 'p1']);
  });
});

describe('usePhotoReactions optimistic toggle', () => {
  beforeEach(() => {
    mockListReactions.mockResolvedValue([{ id: 'r1', emoji: 'heart', user_id: 'other' }]);
    mockToggleReaction.mockResolvedValue({ added: true });
  });
  afterEach(() => jest.clearAllMocks());

  it('loads reactions for the target via the api', async () => {
    const { result } = renderHook(() => usePhotoReactions('photo', 'p1', 'me'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListReactions).toHaveBeenCalledWith('photo', 'p1');
    expect(result.current.data).toHaveLength(1);
  });

  it('optimistically adds my reaction before the request settles', async () => {
    let resolveToggle: (v: { added: boolean }) => void = () => {};
    mockToggleReaction.mockReturnValue(
      new Promise<{ added: boolean }>((res) => {
        resolveToggle = res;
      }),
    );
    const { result } = renderHook(() => usePhotoReactions('photo', 'p1', 'me'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.toggle.mutate('star');
    await waitFor(() =>
      expect(result.current.data?.some((r) => r.emoji === 'star' && r.user_id === 'me')).toBe(true),
    );
    resolveToggle({ added: true });
  });
});
