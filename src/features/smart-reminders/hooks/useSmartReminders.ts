import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listTripSmartReminders,
  setReminderStatus,
  snooze7d,
  type SmartReminder,
} from '../api/smartReminders';

const key = (tripId: string) => ['smart-reminders', tripId] as const;

export function useSmartReminders(tripId: string) {
  return useQuery({ queryKey: key(tripId), queryFn: () => listTripSmartReminders(tripId) });
}

export function useSmartReminderActions(tripId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: key(tripId) });
  return {
    markDone: useMutation({
      mutationFn: (id: string) =>
        setReminderStatus(id, 'done', { marked_done_at: new Date().toISOString() }),
      onSuccess: invalidate,
    }),
    dismiss: useMutation({
      mutationFn: (id: string) => setReminderStatus(id, 'dismissed'),
      onSuccess: invalidate,
    }),
    snooze: useMutation({ mutationFn: (id: string) => snooze7d(id), onSuccess: invalidate }),
  };
}

export type { SmartReminder };
