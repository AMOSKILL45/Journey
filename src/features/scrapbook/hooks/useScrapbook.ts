import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchScrapbookInputs,
  generateScrapbook,
  listScrapbooks,
  type GenerateScrapbookInput,
  type ScrapbookResult,
} from '../api';

/** React Query key for a trip's stored scrapbooks. */
export const scrapbooksQueryKey = (tripId: string) => ['scrapbooks', tripId] as const;

/** React Query key for the data a trip's scrapbook card is rendered from. */
export const scrapbookInputsQueryKey = (tripId: string) => ['scrapbook-inputs', tripId] as const;

/** Load the trip data needed to render the story card + compute stats. */
export function useScrapbookInputs(tripId: string) {
  return useQuery({
    queryKey: scrapbookInputsQueryKey(tripId),
    queryFn: () => fetchScrapbookInputs(tripId),
    enabled: Boolean(tripId),
  });
}

/** Read a trip's previously generated scrapbooks (newest-first, with signed URLs). */
export function useScrapbooks(tripId: string) {
  return useQuery({
    queryKey: scrapbooksQueryKey(tripId),
    queryFn: () => listScrapbooks(tripId),
    enabled: Boolean(tripId),
  });
}

/**
 * Generate a new scrapbook (upload client PNG → invoke edge fn → persist row). On success the
 * trip's scrapbook list is invalidated so the freshly minted recap appears.
 */
export function useGenerateScrapbook(tripId: string) {
  const qc = useQueryClient();
  return useMutation<ScrapbookResult, Error, GenerateScrapbookInput>({
    mutationFn: (input) => generateScrapbook(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scrapbooksQueryKey(tripId) });
    },
  });
}
