import { useQuery } from '@tanstack/react-query';

import { listMyTrips } from '../api/trips';

export const TRIPS_QUERY_KEY = ['trips', 'mine'] as const;

export function useTrips() {
  return useQuery({ queryKey: TRIPS_QUERY_KEY, queryFn: listMyTrips });
}
