import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCheckin,
  createMilestone,
  deleteCheckin,
  deleteMilestone,
  listCheckins,
  listMilestones,
  type CreateMilestoneInput,
} from '../api/milestones';

export const milestonesQueryKey = (tripId: string) => ['milestones', tripId] as const;
export const checkinsQueryKey = (milestoneId: string) => ['checkins', milestoneId] as const;

export function useMilestones(tripId: string) {
  return useQuery({
    queryKey: milestonesQueryKey(tripId),
    queryFn: () => listMilestones(tripId),
    enabled: Boolean(tripId),
  });
}

export function useCreateMilestone(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateMilestoneInput, 'trip_id'>) =>
      createMilestone({ ...input, trip_id: tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
    },
  });
}

export function useDeleteMilestone(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
    },
  });
}

export function useCheckins(milestoneId: string) {
  return useQuery({
    queryKey: checkinsQueryKey(milestoneId),
    queryFn: () => listCheckins(milestoneId),
    enabled: Boolean(milestoneId),
  });
}

export function useCreateCheckin(milestoneId: string, tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => createCheckin(milestoneId, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: checkinsQueryKey(milestoneId) });
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
    },
  });
}

export function useDeleteCheckin(milestoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCheckin(milestoneId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: checkinsQueryKey(milestoneId) });
    },
  });
}
