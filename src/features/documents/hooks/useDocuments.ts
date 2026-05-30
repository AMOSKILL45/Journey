import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFileDocument,
  createUrlDocument,
  deleteDocument,
  listTripDocuments,
  type CreateFileDocumentInput,
  type CreateUrlDocumentInput,
  type DocumentRow,
} from '../api/documents';

export const documentsQueryKey = (tripId: string) => ['documents', tripId] as const;

export function useTripDocuments(tripId: string) {
  return useQuery({
    queryKey: documentsQueryKey(tripId),
    queryFn: () => listTripDocuments(tripId),
    enabled: Boolean(tripId),
  });
}

export function useCreateFileDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateFileDocumentInput, 'tripId'>) =>
      createFileDocument({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}

export function useCreateUrlDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateUrlDocumentInput, 'tripId'>) =>
      createUrlDocument({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}

export function useDeleteDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: DocumentRow) => deleteDocument(doc),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}
