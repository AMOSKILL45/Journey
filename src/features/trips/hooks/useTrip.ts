import { useQuery } from '@tanstack/react-query';

import { getTrip } from '../api/trips';

export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: () => getTrip(id),
    enabled: Boolean(id),
  });
}
