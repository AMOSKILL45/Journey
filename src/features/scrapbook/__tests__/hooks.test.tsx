import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const mockGenerate = jest.fn();
const mockList = jest.fn();
const mockFetchInputs = jest.fn();
jest.mock('../api', () => ({
  generateScrapbook: (...a: unknown[]) => mockGenerate(...a),
  listScrapbooks: (...a: unknown[]) => mockList(...a),
  fetchScrapbookInputs: (...a: unknown[]) => mockFetchInputs(...a),
}));

import {
  scrapbookInputsQueryKey,
  scrapbooksQueryKey,
  useGenerateScrapbook,
  useScrapbooks,
} from '../hooks/useScrapbook';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeWrapper(client: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

describe('scrapbook query keys', () => {
  it('scrapbooksQueryKey is [scrapbooks, tripId]', () => {
    expect(scrapbooksQueryKey('t1')).toEqual(['scrapbooks', 't1']);
  });

  it('scrapbookInputsQueryKey is [scrapbook-inputs, tripId]', () => {
    expect(scrapbookInputsQueryKey('t1')).toEqual(['scrapbook-inputs', 't1']);
  });
});

describe('useScrapbooks', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads a trip’s scrapbooks via the api', async () => {
    mockList.mockResolvedValue([{ id: 's1' }]);
    const { result } = renderHook(() => useScrapbooks('t1'), {
      wrapper: makeWrapper(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith('t1');
    expect(result.current.data).toEqual([{ id: 's1' }]);
  });
});

describe('useGenerateScrapbook', () => {
  afterEach(() => jest.clearAllMocks());

  it('invalidates the trip’s scrapbook list on success', async () => {
    mockGenerate.mockResolvedValue({ pngUrl: 'p', pdfUrl: 'd' });
    const client = makeClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useGenerateScrapbook('t1'), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({ tripId: 't1', pngBase64: 'B64' });

    expect(mockGenerate).toHaveBeenCalledWith({ tripId: 't1', pngBase64: 'B64' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: scrapbooksQueryKey('t1') });
  });
});
