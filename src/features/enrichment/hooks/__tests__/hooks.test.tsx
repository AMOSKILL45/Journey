import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import React from 'react';

jest.mock('../../api', () => ({
  getMilestoneWeather: jest.fn(),
  getTripLegs: jest.fn(),
  triggerEnrich: jest.fn(),
}));

import * as api from '../../api';
import { milestoneWeatherQueryKey, useMilestoneWeather } from '../useMilestoneWeather';
import { legKey, tripLegsQueryKey, useTripDistances } from '../useTripDistances';

const mockApi = api as jest.Mocked<typeof api>;

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.triggerEnrich.mockResolvedValue({ weather: 1, legs: 1 });
});

describe('query key factories', () => {
  it('namespaces weather + legs keys deterministically', () => {
    expect(milestoneWeatherQueryKey('m1')).toEqual(['enrichment', 'weather', 'm1']);
    expect(tripLegsQueryKey('t1')).toEqual(['enrichment', 'legs', 't1']);
  });

  it('builds a directional leg key', () => {
    expect(legKey('a', 'b')).toBe('a->b');
    expect(legKey('a', 'b')).not.toBe(legKey('b', 'a'));
  });
});

describe('useMilestoneWeather', () => {
  it('returns cached weather and does NOT enrich when fresh', async () => {
    mockApi.getMilestoneWeather.mockResolvedValue({
      milestoneId: 'm1',
      payload: { weatherCode: 0, temperatureC: 20, observedAt: '' },
      fetchedAt: '2026-06-05T00:00:00Z',
      expiresAt: '2999-01-01T00:00:00Z',
      isStale: false,
    });
    const { result } = renderHook(() => useMilestoneWeather('m1', { tripId: 't1' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.payload.temperatureC).toBe(20);
    expect(mockApi.triggerEnrich).not.toHaveBeenCalled();
  });

  it('triggers enrich exactly once when the cache is stale', async () => {
    mockApi.getMilestoneWeather.mockResolvedValue({
      milestoneId: 'm1',
      payload: { weatherCode: 0, temperatureC: 20, observedAt: '' },
      fetchedAt: '2020-01-01T00:00:00Z',
      expiresAt: '2020-01-01T06:00:00Z',
      isStale: true,
    });
    const { result } = renderHook(() => useMilestoneWeather('m1', { tripId: 't1' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(mockApi.triggerEnrich).toHaveBeenCalledWith('t1'));
    expect(mockApi.triggerEnrich).toHaveBeenCalledTimes(1);
    expect(result.current).toBeTruthy();
  });

  it('triggers enrich when nothing is cached', async () => {
    mockApi.getMilestoneWeather.mockResolvedValue(null);
    renderHook(() => useMilestoneWeather('m1', { tripId: 't1' }), { wrapper: wrapper() });
    await waitFor(() => expect(mockApi.triggerEnrich).toHaveBeenCalledTimes(1));
  });

  it('does not enrich without a tripId', async () => {
    mockApi.getMilestoneWeather.mockResolvedValue(null);
    const { result } = renderHook(() => useMilestoneWeather('m1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.triggerEnrich).not.toHaveBeenCalled();
  });
});

describe('useTripDistances', () => {
  it('keys legs by from->to and does NOT enrich when present', async () => {
    mockApi.getTripLegs.mockResolvedValue([
      {
        trip_id: 't1',
        from_milestone_id: 'a',
        to_milestone_id: 'b',
        distance_m: 1000,
        duration_s: 60,
        mode: 'driving',
        computed_at: '2026-06-05T00:00:00Z',
      },
    ]);
    const { result } = renderHook(() => useTripDistances('t1'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.byKey.get('a->b')?.distance_m).toBe(1000);
    expect(mockApi.triggerEnrich).not.toHaveBeenCalled();
  });

  it('triggers enrich once when no legs are cached', async () => {
    mockApi.getTripLegs.mockResolvedValue([]);
    renderHook(() => useTripDistances('t1'), { wrapper: wrapper() });
    await waitFor(() => expect(mockApi.triggerEnrich).toHaveBeenCalledTimes(1));
  });
});
