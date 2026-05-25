import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyProfile, updateMyProfile, type ProfileUpdate } from '../api/profile';

const QUERY_KEY = ['my-profile'] as const;

export function useProfile() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: getMyProfile });
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (updates: ProfileUpdate) => updateMyProfile(updates),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
  return { ...query, updateProfile: mutation.mutateAsync, isUpdating: mutation.isPending };
}
