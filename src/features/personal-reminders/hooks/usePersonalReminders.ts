import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createManualReminder,
  deleteReminder,
  listPersonalReminders,
  updateReminder,
  type PersonalReminder,
} from '../api/personalReminders';

const KEY = ['personal-reminders'] as const;

export function usePersonalReminders() {
  return useQuery({ queryKey: KEY, queryFn: listPersonalReminders });
}

export function usePersonalReminderActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    create: useMutation({ mutationFn: createManualReminder, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: string; patch: Parameters<typeof updateReminder>[1] }) =>
        updateReminder(v.id, v.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteReminder, onSuccess: invalidate }),
  };
}

export type { PersonalReminder };
