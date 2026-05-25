import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createInvitation, listInvitations, listMembers } from '../api/members';

export const membersQueryKey = (tripId: string) => ['trip-members', tripId] as const;
export const invitationsQueryKey = (tripId: string) => ['trip-invitations', tripId] as const;

export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: membersQueryKey(tripId),
    queryFn: () => listMembers(tripId),
    enabled: Boolean(tripId),
  });
}

export function useTripInvitations(tripId: string) {
  return useQuery({
    queryKey: invitationsQueryKey(tripId),
    queryFn: () => listInvitations(tripId),
    enabled: Boolean(tripId),
  });
}

export function useCreateInvitation(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string | null) => createInvitation(tripId, email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invitationsQueryKey(tripId) });
    },
  });
}
