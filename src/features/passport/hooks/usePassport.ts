import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchMyPassport, rebuildMyPassport } from '../api';

export const passportKey = ['passport', 'mine'] as const;

export function usePassport() {
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    void rebuildMyPassport()
      .then(() => {
        if (active) void qc.invalidateQueries({ queryKey: passportKey });
      })
      .catch(() => {
        /* read still works from the last persisted state */
      });
    return () => {
      active = false;
    };
  }, [qc]);
  return useQuery({ queryKey: passportKey, queryFn: fetchMyPassport });
}
