import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deletePhoto,
  listTripPhotos,
  updatePhotoCaption,
  uploadPhoto,
  type PhotoRow,
  type UploadPhotoInput,
} from '../api';

export const photosQueryKey = (tripId: string, milestoneId?: string | null) =>
  ['photos', tripId, milestoneId ?? null] as const;

export function useTripPhotos(tripId: string, milestoneId?: string | null) {
  return useQuery({
    queryKey: photosQueryKey(tripId, milestoneId),
    queryFn: () => listTripPhotos(tripId, milestoneId),
    enabled: Boolean(tripId),
  });
}

export function useUploadPhoto(tripId: string, milestoneId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    // The hook's milestoneId scopes the upload; an explicit input.milestoneId still wins.
    mutationFn: (input: Omit<UploadPhotoInput, 'tripId'>) =>
      uploadPhoto({ milestoneId: milestoneId ?? null, ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['photos', tripId] });
    },
  });
}

export function useDeletePhoto(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photo: Pick<PhotoRow, 'id' | 'storage_path'>) => deletePhoto(photo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['photos', tripId] });
    },
  });
}

export function useUpdatePhotoCaption(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, caption }: { photoId: string; caption: string | null }) =>
      updatePhotoCaption(photoId, caption),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['photos', tripId] });
    },
  });
}
