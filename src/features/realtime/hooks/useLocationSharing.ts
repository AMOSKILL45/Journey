import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMySharing, setPanic, setSharing, type LocationSharing } from '../api/sharing';

const key = (tripId: string) => ['location-sharing', tripId] as const;
const PANIC_MS = 60 * 60 * 1000; // "Hide live for 1h"

export function useLocationSharing(tripId: string) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: key(tripId), queryFn: () => getMySharing(tripId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key(tripId) });

  const update = useMutation({
    mutationFn: (mode: LocationSharing) => setSharing(tripId, mode),
    onSuccess: invalidate,
  });
  const startPanic = useMutation({
    mutationFn: () => setPanic(tripId, new Date(Date.now() + PANIC_MS).toISOString()),
    onSuccess: invalidate,
  });
  const clearPanic = useMutation({
    mutationFn: () => setPanic(tripId, null),
    onSuccess: invalidate,
  });

  return { ...query, update, startPanic, clearPanic };
}
